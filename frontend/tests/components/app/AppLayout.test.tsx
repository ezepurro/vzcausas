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
            ['una persona de secretaría', 'gestion'],
            ['secretaría y abogado a la vez', 'sledesma'],
        ])('%s ve sólo el trabajo diario', (_, username) => {
            renderWithProviders(<AppLayout />, { ...ROUTES, as: username, route: '/inicio' })

            for (const label of DAILY_WORK) {
                expect(railItem(label)).toBeInTheDocument()
            }
            for (const label of ADMINISTRATION) {
                expect(railItem(label)).not.toBeInTheDocument()
            }
        })

        /* Un título de grupo sin nada abajo confunde: si el perfil no puede
           abrir ninguno de sus ítems, el grupo entero no se muestra. */
        it('si el perfil no ve ningún ítem de un grupo, tampoco ve el título', () => {
            renderWithProviders(<AppLayout />, { ...ROUTES, as: 'gestion', route: '/inicio' })

            expect(rail().getByText('Trabajo diario')).toBeInTheDocument()
            expect(rail().queryByText('Administración')).not.toBeInTheDocument()
        })
    })

    describe('ítem activo', () => {
        it('marca la sección en la que se está', () => {
            renderWithProviders(<AppLayout />, { ...ROUTES, as: 'supervision', route: '/usuarios' })

            expect(railItem('Usuarios')).toHaveAttribute('aria-current', 'page')
            expect(railItem('Inicio')).not.toHaveAttribute('aria-current')
        })

        it('en una subruta sigue marcando la sección que la contiene', () => {
            renderWithProviders(<AppLayout />, { ...ROUTES, as: 'supervision', route: '/usuarios/8' })

            expect(railItem('Usuarios')).toHaveAttribute('aria-current', 'page')
        })

        it('al tocar un ítem navega a su sección y lo marca', async () => {
            const { user } = renderWithProviders(<AppLayout />, {
                ...ROUTES,
                as: 'supervision',
                route: '/inicio',
            })

            await user.click(railItem('Usuarios')!)

            expect(screen.getByText('Pantalla de usuarios')).toBeInTheDocument()
            expect(railItem('Usuarios')).toHaveAttribute('aria-current', 'page')
        })
    })

    /* "Nueva causa" bajo el logo, como el prototipo. Registrar una causa la
       puede hacer cualquier perfil (RN11), así que lo ven los tres. */
    describe('"Nueva causa"', () => {
        it.each([
            ['el administrador', 'supervision'],
            ['un abogado', 'mrios'],
            ['una persona de secretaría', 'gestion'],
        ])('%s lo ve en el rail, habilitado', (_, username) => {
            renderWithProviders(<AppLayout />, { ...ROUTES, as: username, route: '/inicio' })

            expect(railItem('Nueva causa')).toBeEnabled()
        })

        it('lleva al alta de causa', async () => {
            const { user } = renderWithProviders(<AppLayout />, {
                ...ROUTES,
                as: 'gestion',
                route: '/inicio',
            })

            await user.click(railItem('Nueva causa')!)

            expect(screen.getByText('Pantalla de registrar causa')).toBeInTheDocument()
        })

        /* Con el rail colapsado queda sólo el ícono, así que el nombre lo tiene
           que dar el `title`. */
        it('se nombra también con el título, para cuando el rail está colapsado', () => {
            renderWithProviders(<AppLayout />, { ...ROUTES, as: 'gestion', route: '/inicio' })

            expect(railItem('Nueva causa')).toHaveAttribute('title', 'Nueva causa')
        })
    })
})
