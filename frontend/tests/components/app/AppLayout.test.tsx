import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { AppLayout } from '@/app/layouts/AppLayout'

const ROUTES = {
    children: [
        { path: '/inicio', element: <p>Pantalla de inicio</p> },
        { path: '/usuarios', element: <p>Pantalla de usuarios</p> },
        { path: '/usuarios/:userId', element: <p>Detalle de usuario</p> },
        { path: '/causas/nueva', element: <p>Pantalla de registrar causa</p> },
    ],
}

const DAILY_WORK = ['Inicio', 'Causas', 'Vencimientos', 'Clientes', 'Modelos']
const ADMINISTRATION = ['Usuarios', 'Abogados', 'Estados y plazos', 'Calificaciones legales', 'Reportes']

/** El menú lateral, tal como lo encuentra un lector de pantalla. */
function rail() {
    return within(screen.getByRole('navigation', { name: 'Navegación principal' }))
}

function railItem(label: string) {
    return rail().queryByRole('button', { name: label })
}

describe('AppLayout', () => {
    describe('menú según el perfil', () => {
        it('el administrador ve el trabajo diario y la administración', () => {
            renderWithProviders(<AppLayout />, { ...ROUTES, as: 'supervision', route: '/inicio' })

            for (const label of [...DAILY_WORK, ...ADMINISTRATION]) {
                expect(railItem(label)).toBeInTheDocument()
            }
            expect(rail().getByText('Administración')).toBeInTheDocument()
        })

        it.each([
            ['un abogado', 'mrios'],
        ])('%s ve sólo el trabajo diario', (_, username) => {
            renderWithProviders(<AppLayout />, { ...ROUTES, as: username, route: '/inicio' })

            for (const label of DAILY_WORK) {
                expect(railItem(label)).toBeInTheDocument()
            }
            for (const label of ADMINISTRATION) {
                expect(railItem(label)).not.toBeInTheDocument()
            }
        })
    })
})
