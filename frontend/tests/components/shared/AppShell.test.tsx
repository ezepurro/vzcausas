/**
 * El menú en pantallas angostas.
 *
 * Debajo de 1024px el rail deja de ocupar lugar: queda fuera de la pantalla y
 * se abre con el botón de la barra superior, como en el prototipo. Que esté
 * adentro o afuera lo decide el CSS; lo que se prueba acá es el estado —
 * abierto o cerrado— y todo lo que lo cambia.
 */

import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell, type RailGroup } from '@/shared/components/ui'

const GROUPS: RailGroup[] = [
    {
        label: 'Trabajo diario',
        items: [
            { id: '/inicio', label: 'Inicio', icon: 'home' },
            { id: '/causas', label: 'Causas', icon: 'cases' },
        ],
    },
]

function renderShell() {
    const onNavigate = vi.fn()
    render(
        <AppShell
            groups={GROUPS}
            active="/inicio"
            onNavigate={onNavigate}
            brand={<div>VZ Causas</div>}
            railAction={<button type="button">Nueva causa</button>}
            railFooter={<button type="button">Cerrar sesión</button>}
        >
            <p>Contenido</p>
        </AppShell>,
    )
    return { onNavigate, user: userEvent.setup() }
}

const openButton = () => screen.getByRole('button', { name: 'Abrir menú' })
const rail = () => within(screen.getByRole('navigation', { name: 'Navegación principal' }))
const isOpen = () => openButton().getAttribute('aria-expanded') === 'true'

describe('AppShell: menú en pantallas angostas', () => {
    it('arranca cerrado', () => {
        renderShell()

        expect(isOpen()).toBe(false)
    })

    it('el botón de la barra superior lo abre', async () => {
        const { user } = renderShell()

        await user.click(openButton())

        expect(isOpen()).toBe(true)
    })

    it('el botón de cerrar del rail lo cierra', async () => {
        const { user } = renderShell()
        await user.click(openButton())

        await user.click(rail().getByRole('button', { name: 'Cerrar menú' }))

        expect(isOpen()).toBe(false)
    })

    it('tocar el fondo lo cierra', async () => {
        const { user } = renderShell()
        await user.click(openButton())

        // El fondo no tiene rol propio: se lo busca por su clase.
        await user.click(document.querySelector('.vz-scrim') as HTMLElement)

        expect(isOpen()).toBe(false)
    })

    it('Escape lo cierra', async () => {
        const { user } = renderShell()
        await user.click(openButton())

        await user.keyboard('{Escape}')

        expect(isOpen()).toBe(false)
    })

    it('elegir una sección navega y lo cierra', async () => {
        const { user, onNavigate } = renderShell()
        await user.click(openButton())

        await user.click(rail().getByRole('link', { name: 'Causas' }))

        expect(onNavigate).toHaveBeenCalledWith('/causas')
        expect(isOpen()).toBe(false)
    })

    it('abierto, el foco entra al menú y la página queda inerte; al cerrar, vuelve al botón', async () => {
        const { user } = renderShell()
        const page = screen.getByRole('main').parentElement as HTMLElement

        await user.click(openButton())
        expect(rail().getByRole('button', { name: 'Cerrar menú' })).toHaveFocus()
        expect(page).toHaveAttribute('inert')

        await user.keyboard('{Escape}')
        expect(page).not.toHaveAttribute('inert')
        expect(screen.getByRole('button', { name: 'Abrir menú', hidden: true })).toHaveFocus()
    })

    it.each(['Nueva causa', 'Cerrar sesión'])('tocar "%s" también lo cierra', async (name) => {
        const { user } = renderShell()
        await user.click(openButton())

        await user.click(rail().getByRole('button', { name }))

        expect(isOpen()).toBe(false)
    })

    it('abierto, la página de abajo no scrollea; al cerrarlo vuelve a scrollear', async () => {
        const { user } = renderShell()

        await user.click(openButton())
        expect(document.documentElement.style.overflow).toBe('hidden')

        await user.keyboard('{Escape}')
        expect(document.documentElement.style.overflow).toBe('')
    })

    it('al agrandar la ventana por encima de 1024px se cierra solo', async () => {
        // jsdom no implementa `matchMedia`: se simula la ventana que se agranda.
        const listeners = new Set<() => void>()
        const query = {
            matches: false,
            addEventListener: (_: string, listener: () => void) => listeners.add(listener),
            removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
        }
        vi.stubGlobal('matchMedia', vi.fn(() => query))
        try {
            const { user } = renderShell()
            await user.click(openButton())

            query.matches = true
            act(() => listeners.forEach((listener) => listener()))

            expect(isOpen()).toBe(false)
        } finally {
            vi.unstubAllGlobals()
        }
    })
})

describe('AppShell: los ítems del rail son enlaces', () => {
    it('cada sección es un enlace a su ruta, y la actual está marcada', () => {
        renderShell()

        expect(rail().getByRole('link', { name: 'Causas' })).toHaveAttribute('href', '/causas')
        expect(rail().getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
        expect(rail().getByRole('link', { name: 'Causas' })).not.toHaveAttribute('aria-current')
    })

    it('un clic común navega la app sin recargar', async () => {
        const { user, onNavigate } = renderShell()

        await user.click(rail().getByRole('link', { name: 'Causas' }))

        expect(onNavigate).toHaveBeenCalledWith('/causas')
    })

    it('con Ctrl apretado se deja al navegador: abrir en otra pestaña', async () => {
        const { user, onNavigate } = renderShell()

        await user.keyboard('{Control>}')
        await user.click(rail().getByRole('link', { name: 'Causas' }))
        await user.keyboard('{/Control}')

        expect(onNavigate).not.toHaveBeenCalled()
    })
})

describe('AppShell: saltar al contenido', () => {
    it('es lo primero que encuentra el tabulador y lleva el foco al contenido', async () => {
        const { user } = renderShell()

        await user.tab()
        const skip = screen.getByRole('link', { name: 'Saltar al contenido' })
        expect(skip).toHaveFocus()

        await user.click(skip)
        expect(screen.getByRole('main')).toHaveFocus()
    })
})

describe('AppShell: marca de la barra superior', () => {
    it('dibuja la marca que recibe en la barra superior', () => {
        render(
            <AppShell groups={GROUPS} active="/inicio" onNavigate={vi.fn()} brand={null} topBarBrand={<span>Marca</span>}>
                <p>Contenido</p>
            </AppShell>,
        )

        expect(within(screen.getByRole('banner')).getByText('Marca')).toBeInTheDocument()
    })
})
