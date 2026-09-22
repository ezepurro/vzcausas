import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { renderWithProviders } from '../../setup/render'
import { useAuth } from '@/app/providers/AuthContext'
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

    /* Cerrar sesión a mano y que te eche un token vencido se ven igual desde
       la guarda, pero sólo el segundo merece que te devuelvan a la pantalla.
       Si no, en una máquina compartida el próximo que entre aterriza en la
       pantalla del anterior. */
    it('si la persona pidió salir, no anota la pantalla', async () => {
        function SignOutButton() {
            const { signOut } = useAuth()
            return <button onClick={() => signOut('user')}>Cerrar sesión</button>
        }

        const user = userEvent.setup()
        renderWithProviders(<RequireSession />, {
            as: 'fvazquez',
            route: '/usuarios',
            children: [{ path: '/usuarios', element: <SignOutButton /> }],
            routes: [{ path: '/login', element: <LoginSpy /> }],
        })

        await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

        expect(await screen.findByText('Pantalla de login · volver a ninguno')).toBeInTheDocument()
    })

    it('si lo echó un token vencido, sí la anota', async () => {
        function ExpireButton() {
            const { signOut } = useAuth()
            return <button onClick={() => signOut()}>Vencer</button>
        }

        const user = userEvent.setup()
        renderWithProviders(<RequireSession />, {
            as: 'fvazquez',
            route: '/usuarios',
            children: [{ path: '/usuarios', element: <ExpireButton /> }],
            routes: [{ path: '/login', element: <LoginSpy /> }],
        })

        await user.click(screen.getByRole('button', { name: 'Vencer' }))

        expect(
            await screen.findByText('Pantalla de login · volver a /usuarios'),
        ).toBeInTheDocument()
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
