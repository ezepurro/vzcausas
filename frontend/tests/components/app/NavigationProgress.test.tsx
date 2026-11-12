/**
 * Lo que se ve mientras se descarga una pantalla (`lazy`, ver `pages.ts`):
 *
 * - Al navegar, una barra bajo la barra superior (`NavigationProgress`), pero
 *   sólo si tarda: lo ya descargado no la hace parpadear.
 * - Al abrir la app en una pantalla que no llegó, "Cargando…" en vez de una
 *   página en blanco (`BootScreen`, el `hydrateFallbackElement` de la raíz).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider, type RouteObject } from 'react-router'
import { NAVIGATION_PROGRESS_DELAY_MS, NavigationProgress } from '@/app/layouts/NavigationProgress'
import { BootScreen } from '@/app/layouts/BootScreen'

/** Una pantalla `lazy` que llega cuando el test la suelta. */
function deferredPage(text: string) {
    let release: () => void = () => {}
    const loaded = new Promise<void>((resolve) => {
        release = resolve
    })
    const lazy = async () => {
        await loaded
        return { Component: () => <p>{text}</p> }
    }
    return { lazy, release }
}

function renderFrame(children: RouteObject[]) {
    const router = createMemoryRouter(
        [
            {
                element: (
                    <div>
                        <NavigationProgress />
                        <Outlet />
                    </div>
                ),
                children: [{ path: '/', element: <p>Pantalla de inicio</p> }, ...children],
            },
        ],
        { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    return router
}

/* El reloj lo maneja el test: con el real, una máquina cargada (la suite
   entera en paralelo) tarda más de 150 ms entre dos líneas y el test mira
   tarde. */
describe('NavigationProgress', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    /** Avanza el reloj y deja correr lo que quedó pendiente (promesas y renders). */
    async function advance(ms: number) {
        await act(async () => {
            await vi.advanceTimersByTimeAsync(ms)
        })
    }

    function navigate(router: ReturnType<typeof renderFrame>, to: string) {
        act(() => {
            void router.navigate(to)
        })
    }

    it('si la pantalla tarda, muestra la barra recién a los 150 ms y la saca cuando llega', async () => {
        const page = deferredPage('Pantalla de abogados')
        const router = renderFrame([{ path: '/abogados', lazy: page.lazy }])

        navigate(router, '/abogados')
        await advance(NAVIGATION_PROGRESS_DELAY_MS - 1)
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

        await advance(1)
        expect(screen.getByRole('progressbar', { name: 'Cargando la pantalla' })).toBeInTheDocument()
        // La pantalla anterior sigue a la vista mientras tanto.
        expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument()

        page.release()
        await advance(0)

        expect(screen.getByText('Pantalla de abogados')).toBeInTheDocument()
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('una pantalla que ya está no la muestra', async () => {
        const router = renderFrame([{ path: '/clientes', element: <p>Pantalla de clientes</p> }])

        navigate(router, '/clientes')
        await advance(NAVIGATION_PROGRESS_DELAY_MS * 2)

        expect(screen.getByText('Pantalla de clientes')).toBeInTheDocument()
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('si llega antes de los 150 ms, nunca aparece', async () => {
        const page = deferredPage('Pantalla de abogados')
        const router = renderFrame([{ path: '/abogados', lazy: page.lazy }])

        navigate(router, '/abogados')
        await advance(NAVIGATION_PROGRESS_DELAY_MS - 50)
        // Todavía cargando, y sin barra.
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        page.release()
        await advance(0)
        expect(screen.getByText('Pantalla de abogados')).toBeInTheDocument()

        // Pasa el momento en que habría aparecido: el aviso se canceló al llegar.
        await advance(NAVIGATION_PROGRESS_DELAY_MS * 2)
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
})

describe('BootScreen (al abrir la app)', () => {
    it('muestra "Cargando…" mientras llega la pantalla, no una página en blanco', async () => {
        const page = deferredPage('Pantalla de abogados')
        const router = createMemoryRouter(
            [
                {
                    hydrateFallbackElement: <BootScreen label="Cargando" />,
                    element: <Outlet />,
                    children: [{ path: '/abogados', lazy: page.lazy }],
                },
            ],
            { initialEntries: ['/abogados'] },
        )
        render(<RouterProvider router={router} />)

        expect(screen.getByRole('status')).toHaveTextContent('Cargando…')

        page.release()

        expect(await screen.findByText('Pantalla de abogados')).toBeInTheDocument()
        await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    })
})
