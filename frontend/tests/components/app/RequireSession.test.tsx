import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { useLocation } from 'react-router'
import { renderWithProviders } from '../../setup/render'
import { RequireSession } from '@/app/router/RequireSession'

/** Muestra a dónde quería ir quien fue desviado al login. */
function LoginSpy() {
    const location = useLocation()
    const from = (location.state as { from?: string } | null)?.from ?? 'ninguno'
    return <p>Pantalla de login · volver a {from}</p>
}

const ROUTES = {
    children: [{ path: '/usuarios', element: <p>Pantalla privada</p> }],
    routes: [{ path: '/login', element: <LoginSpy /> }],
}

describe('RequireSession', () => {
    it('con sesión deja ver la pantalla', () => {
        renderWithProviders(<RequireSession />, { ...ROUTES, as: 'fvazquez', route: '/usuarios' })

        expect(screen.getByText('Pantalla privada')).toBeInTheDocument()
    })

    it('sin sesión redirige al login', () => {
        renderWithProviders(<RequireSession />, { ...ROUTES, route: '/usuarios' })

        expect(screen.queryByText('Pantalla privada')).not.toBeInTheDocument()
        expect(screen.getByText(/pantalla de login/i)).toBeInTheDocument()
    })

    it('al redirigir, anota a dónde quería ir (con sus parámetros)', () => {
        renderWithProviders(<RequireSession />, { ...ROUTES, route: '/usuarios?page=2' })

        expect(screen.getByText('Pantalla de login · volver a /usuarios?page=2')).toBeInTheDocument()
    })

    it('con una sesión vencida guardada también redirige', () => {
        localStorage.setItem('vz.token', 'token-viejo')
        localStorage.setItem(
            'vz.session',
            JSON.stringify({
                user: {
                    id: 1,
                    username: 'fvazquez',
                    fullName: 'Fernando G. Vázquez',
                    email: 'fvazquez@vazquezzarate.com',
                    roles: ['ADMINISTRATOR'],
                    lawyer: null,
                    lastLoginAt: null,
                    active: true,
                },
                expiresAt: Date.now() - 1000,
            }),
        )

        renderWithProviders(<RequireSession />, { ...ROUTES, route: '/usuarios' })

        expect(screen.getByText(/pantalla de login/i)).toBeInTheDocument()
    })
})
