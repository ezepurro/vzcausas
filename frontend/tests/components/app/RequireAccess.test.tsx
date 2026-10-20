import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, waitForSession } from '../../setup/render'
import { RequireAccess } from '@/app/router/RequireAccess'

const ROUTES = {
    children: [
        { path: '/usuarios', element: <p>Pantalla de usuarios</p> },
        { path: '/usuarios/:userId', element: <p>Detalle de usuario</p> },
        { path: '/inicio', element: <p>Pantalla de inicio</p> },
    ],
}

describe('RequireAccess', () => {
    it('el administrador ve la sección de administración', async () => {
        renderWithProviders(<RequireAccess />, { ...ROUTES, as: 'supervision', route: '/usuarios' })
        await waitForSession()

        expect(screen.getByText('Pantalla de usuarios')).toBeInTheDocument()
        expect(screen.queryByText('No tenés permiso para ver esta sección')).not.toBeInTheDocument()
    })

    it.each([
        ['un abogado', 'mrios'],
    ])('%s ve el aviso de sin acceso en vez de la pantalla', async (_, username) => {
        renderWithProviders(<RequireAccess />, { ...ROUTES, as: username, route: '/usuarios' })
        await waitForSession()

        expect(screen.queryByText('Pantalla de usuarios')).not.toBeInTheDocument()
        expect(screen.getByText('No tenés permiso para ver esta sección')).toBeInTheDocument()
    })
})
