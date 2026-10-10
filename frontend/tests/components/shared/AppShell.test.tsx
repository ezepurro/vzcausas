/**
 * El menú en pantallas angostas.
 *
 * Debajo de 1024px el rail deja de ocupar lugar: queda fuera de la pantalla y
 * se abre con el botón de la barra superior, como en el prototipo. Que esté
 * adentro o afuera lo decide el CSS; lo que se prueba acá es el estado —
 * abierto o cerrado— y todo lo que lo cambia.
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

        await user.click(rail().getByRole('button', { name: 'Causas' }))

        expect(onNavigate).toHaveBeenCalledWith('/causas')
        expect(isOpen()).toBe(false)
    })

    it.each(['Nueva causa', 'Cerrar sesión'])('tocar "%s" también lo cierra', async (name) => {
        const { user } = renderShell()
        await user.click(openButton())

        await user.click(rail().getByRole('button', { name }))

        expect(isOpen()).toBe(false)
    })
})
