import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { RedirectIfSession } from '@/app/router/RedirectIfSession'

const ROUTES = {
    children: [{ path: '/login', element: <p>Formulario de login</p> }],
    routes: [
        { path: '/inicio', element: <p>Pantalla de inicio</p> },
        { path: '/usuarios', element: <p>Pantalla de usuarios</p> },
    ],
}

describe('RedirectIfSession', () => {
    it('sin sesión muestra el login', () => {
        renderWithProviders(<RedirectIfSession />, { ...ROUTES, route: '/login' })

        expect(screen.getByText('Formulario de login')).toBeInTheDocument()
    })

    it('con sesión no deja ver el login y manda a inicio', () => {
        renderWithProviders(<RedirectIfSession />, { ...ROUTES, as: 'gestion', route: '/login' })

        expect(screen.queryByText('Formulario de login')).not.toBeInTheDocument()
        expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument()
    })

    /* Esta guarda es la única que decide el destino de quien tiene sesión, así
       que es la única que puede respetar la pantalla que se había pedido. El
       `from` lo anota `RequireSession` al desviar al login. */
    it('con sesión y una pantalla anotada, vuelve a ésa y no a inicio', () => {
        renderWithProviders(<RedirectIfSession />, {
            ...ROUTES,
            as: 'gestion',
            route: '/login',
            state: { from: '/usuarios' },
        })

        expect(screen.getByText('Pantalla de usuarios')).toBeInTheDocument()
        expect(screen.queryByText('Pantalla de inicio')).not.toBeInTheDocument()
    })

    it('sin pantalla anotada, el destino es inicio', () => {
        renderWithProviders(<RedirectIfSession />, {
            ...ROUTES,
            as: 'gestion',
            route: '/login',
            state: { otraCosa: true },
        })

        expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument()
    })
})
