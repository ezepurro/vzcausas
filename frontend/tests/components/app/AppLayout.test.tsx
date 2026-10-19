import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { AppLayout } from '@/app/layouts/AppLayout'

const ROUTES = {
    children: [
        { path: '/inicio', element: <p>Pantalla de inicio</p> },
        { path: '/causas', element: <p>Pantalla de causas</p> },
        { path: '/usuarios', element: <p>Pantalla de usuarios</p> },
        { path: '/usuarios/:userId', element: <p>Detalle de usuario</p> },
        { path: '/causas/nueva', element: <p>Pantalla de registrar causa</p> },
    ],
}

const DAILY_WORK = ['Inicio', 'Causas', 'Clientes', 'Modelos']
/** Lo que la Secretaría no tiene: el tablero (CA-41.13) y los modelos formales (CA-35.8). */
const NOT_FOR_SECRETARY = ['Inicio', 'Modelos']
/** Lo que la matriz de permisos abre a los tres perfiles (V3 §4, D-39). */
const SHARED_ADMINISTRATION = ['Abogados', 'Estados y plazos', 'Calificaciones legales']
/** Lo que sigue siendo sólo del Administrador. */
const ADMINISTRATOR_ONLY = ['Usuarios', 'Reportes']
const ADMINISTRATION = [...SHARED_ADMINISTRATION, ...ADMINISTRATOR_ONLY]

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

        it('un abogado ve el trabajo diario y la administración compartida, sin usuarios ni reportes', () => {
            renderWithProviders(<AppLayout />, { ...ROUTES, as: 'mrios', route: '/inicio' })

            for (const label of [...DAILY_WORK, ...SHARED_ADMINISTRATION]) {
                expect(railItem(label)).toBeInTheDocument()
            }
            for (const label of ADMINISTRATOR_ONLY) {
                expect(railItem(label)).not.toBeInTheDocument()
            }
        })

        /* V4 §4: la Secretaría no tiene tablero ni modelos formales. */
        it('la secretaría ve el trabajo diario sin inicio ni modelos, y la administración compartida', () => {
            renderWithProviders(<AppLayout />, { ...ROUTES, as: 'gestion', route: '/causas' })

            for (const label of [...DAILY_WORK.filter((l) => !NOT_FOR_SECRETARY.includes(l)), ...SHARED_ADMINISTRATION]) {
                expect(railItem(label)).toBeInTheDocument()
            }
            for (const label of [...NOT_FOR_SECRETARY, ...ADMINISTRATOR_ONLY]) {
                expect(railItem(label)).not.toBeInTheDocument()
            }
        })
    })
})
