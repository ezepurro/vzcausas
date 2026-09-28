import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { RequireAccess } from '@/app/router/RequireAccess'

const ROUTES = {
    children: [
        { path: '/usuarios', element: <p>Pantalla de usuarios</p> },
        { path: '/usuarios/:userId', element: <p>Detalle de usuario</p> },
        { path: '/inicio', element: <p>Pantalla de inicio</p> },
    ],
}

describe('RequireAccess', () => {
    it('el administrador ve la sección de administración', () => {
        renderWithProviders(<RequireAccess />, { ...ROUTES, as: 'supervision', route: '/usuarios' })

        expect(screen.getByText('Pantalla de usuarios')).toBeInTheDocument()
        expect(screen.queryByText('No tenés permiso para ver esta sección')).not.toBeInTheDocument()
    })

    it('administrador y abogado a la vez también la ve', () => {
        renderWithProviders(<RequireAccess />, { ...ROUTES, as: 'fvazquez', route: '/usuarios' })

        expect(screen.getByText('Pantalla de usuarios')).toBeInTheDocument()
    })

    it.each([
        ['un abogado', 'mrios'],
        ['una persona de secretaría', 'gestion'],
        ['secretaría y abogado a la vez', 'sledesma'],
    ])('%s ve el aviso de sin acceso en vez de la pantalla', (_, username) => {
        renderWithProviders(<RequireAccess />, { ...ROUTES, as: username, route: '/usuarios' })

        expect(screen.queryByText('Pantalla de usuarios')).not.toBeInTheDocument()
        expect(screen.getByText('No tenés permiso para ver esta sección')).toBeInTheDocument()
    })

    it('protege también las subrutas de la sección', () => {
        renderWithProviders(<RequireAccess />, { ...ROUTES, as: 'gestion', route: '/usuarios/8' })

        expect(screen.queryByText('Detalle de usuario')).not.toBeInTheDocument()
        expect(screen.getByText('No tenés permiso para ver esta sección')).toBeInTheDocument()
    })

    it('deja pasar a cualquier perfil a una sección del trabajo diario', () => {
        renderWithProviders(<RequireAccess />, { ...ROUTES, as: 'gestion', route: '/inicio' })

        expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument()
    })

    it('desde el aviso se puede volver al inicio', async () => {
        const { user } = renderWithProviders(<RequireAccess />, {
            ...ROUTES,
            as: 'gestion',
            route: '/usuarios',
        })

        await user.click(screen.getByRole('button', { name: 'Ir al inicio' }))

        expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument()
    })
})
