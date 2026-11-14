/**
 * La pantalla de error del router (`errorElement`). Con `lazy`, cada pantalla
 * es un archivo que se descarga al entrar: si falla (un despliegue nuevo con
 * una pestaña vieja abierta, o se corta la red), el usuario tiene que ver qué
 * pasó y cómo seguir, no la pantalla genérica de React Router sin el rail.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider, type RouteObject } from 'react-router'
import { RouteErrorPage } from '@/app/router/RouteErrorPage'
import { isChunkLoadError } from '@/app/router/chunkError'

/** Lo que tira Chrome cuando el archivo de la pantalla ya no está en el servidor. */
const CHUNK_ERROR = new TypeError(
    'Failed to fetch dynamically imported module: http://localhost/assets/LawyersPage-a1b2c3.js',
)

function Broken(): never {
    throw new Error('se rompió al dibujar')
}

/** Un marco con rail de mentira y, adentro, las rutas con su `errorElement` (como `index.tsx`). */
function renderRoutes(children: RouteObject[], initial: string) {
    const router = createMemoryRouter(
        [
            {
                element: (
                    <div>
                        <nav>Rail de la app</nav>
                        <Outlet />
                    </div>
                ),
                children: [
                    { path: '/', element: <p>Pantalla de inicio</p> },
                    { errorElement: <RouteErrorPage />, children },
                ],
            },
        ],
        { initialEntries: [initial] },
    )
    render(<RouterProvider router={router} />)
    return { user: userEvent.setup(), router }
}

describe('RouteErrorPage', () => {
    beforeEach(() => {
        // El error se loguea a propósito: acá sólo ensucia la salida.
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('si la pantalla no se pudo descargar, lo dice y ofrece recargar, con el rail a la vista', async () => {
        renderRoutes([{ path: '/abogados', lazy: () => Promise.reject(CHUNK_ERROR) }], '/abogados')

        const alert = await screen.findByRole('alert')
        expect(alert).toHaveTextContent('No se pudo cargar esta pantalla')
        expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument()
        // Volver al inicio pediría otra pantalla igual de vieja: lo que sirve es recargar.
        expect(screen.queryByRole('button', { name: 'Volver al inicio' })).not.toBeInTheDocument()
        expect(screen.getByText('Rail de la app')).toBeInTheDocument()
    })

    it('si la pantalla falla al dibujarse, muestra un mensaje sin el detalle técnico', async () => {
        renderRoutes([{ path: '/causas', element: <Broken /> }], '/causas')

        const alert = await screen.findByRole('alert')
        expect(alert).toHaveTextContent('Algo salió mal al mostrar esta pantalla')
        expect(alert).not.toHaveTextContent('se rompió al dibujar')
        expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument()
        expect(screen.getByText('Rail de la app')).toBeInTheDocument()
    })

    it('"Volver al inicio" navega y deja el error atrás', async () => {
        const { user, router } = renderRoutes([{ path: '/causas', element: <Broken /> }], '/causas')

        await user.click(await screen.findByRole('button', { name: 'Volver al inicio' }))

        expect(router.state.location.pathname).toBe('/')
        expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument()
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('manda el error a la consola', async () => {
        renderRoutes([{ path: '/causas', element: <Broken /> }], '/causas')
        await screen.findByRole('alert')

        expect(console.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'se rompió al dibujar' }))
    })

    /* Recargar sin red lleva a la pantalla de "sin internet" del navegador, y
       de ahí no hay vuelta a la app. */
    it('sin conexión no ofrece recargar: espera a que vuelva la red', async () => {
        const onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
        renderRoutes([{ path: '/abogados', lazy: () => Promise.reject(CHUNK_ERROR) }], '/abogados')

        expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión')
        expect(screen.getByRole('button', { name: 'Esperando conexión…' })).toBeDisabled()
        expect(screen.getByText('Rail de la app')).toBeInTheDocument()

        onLine.mockReturnValue(true)
        act(() => {
            window.dispatchEvent(new Event('online'))
        })

        /* Con espera: el aviso se redibuja al enterarse de `online`, y con
           toda la suite corriendo a veces no llegó a hacerlo antes de esta
           línea (falló una vez en una corrida completa; aislado, nunca). */
        await waitFor(() =>
            expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar esta pantalla'),
        )
        expect(screen.getByRole('button', { name: 'Recargar' })).toBeEnabled()
    })

    it('si se corta la red con el aviso en pantalla, el botón deja de ofrecer recargar', async () => {
        const onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
        renderRoutes([{ path: '/causas', element: <Broken /> }], '/causas')
        expect(await screen.findByRole('button', { name: 'Recargar' })).toBeEnabled()

        onLine.mockReturnValue(false)
        act(() => {
            window.dispatchEvent(new Event('offline'))
        })

        expect(await screen.findByRole('button', { name: 'Esperando conexión…' })).toBeDisabled()
        // Navegar dentro de la app no recarga la página: sigue disponible.
        expect(screen.getByRole('button', { name: 'Volver al inicio' })).toBeEnabled()
    })

    it('a pantalla completa (la raíz) dibuja lo mismo, sin marco', async () => {
        const router = createMemoryRouter(
            [{ path: '/', element: <Broken />, errorElement: <RouteErrorPage fullPage /> }],
            { initialEntries: ['/'] },
        )
        render(<RouterProvider router={router} />)

        expect(await screen.findByRole('main')).toContainElement(screen.getByRole('alert'))
    })
})

describe('isChunkLoadError', () => {
    it('reconoce la descarga fallida en cada navegador', () => {
        expect(isChunkLoadError(CHUNK_ERROR)).toBe(true) // Chrome
        expect(isChunkLoadError(new TypeError('error loading dynamically imported module: /assets/x.js'))).toBe(true) // Firefox
        expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true) // Safari
        expect(isChunkLoadError(new Error('Unable to preload CSS for /assets/x.css'))).toBe(true) // Vite
    })

    it('no confunde otros errores con una descarga fallida', () => {
        expect(isChunkLoadError(new Error('se rompió al dibujar'))).toBe(false)
        expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false)
        expect(isChunkLoadError(undefined)).toBe(false)
    })
})
