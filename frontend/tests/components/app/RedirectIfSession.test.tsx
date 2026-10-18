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
    it('con sesión no deja ver el login y manda a inicio', () => {
        renderWithProviders(<RedirectIfSession />, { ...ROUTES, as: 'gestion', route: '/login' })

        expect(screen.queryByText('Formulario de login')).not.toBeInTheDocument()
        expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument()
    })
})
