import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { db, errorBody, LAWYERS } from '@/shared/mocks'
import { LawyersPage } from '@/features/lawyers/pages/LawyersPage'

function renderPage(as = 'fvazquez') {
    return renderWithProviders(<LawyersPage />, {
        as,
        path: '/abogados',
        route: '/abogados',
    })
}

async function openCreate(user: ReturnType<typeof renderPage>['user']) {
    await user.click(screen.getByRole('button', { name: 'Registrar abogado' }))
    return screen.getByRole('dialog')
}

describe('LawyersPage', () => {
    describe('listado', () => {
        it('muestra los abogados del estudio', async () => {
            renderPage()

            expect(await screen.findByText('Dr. Fernando G. Vázquez')).toBeInTheDocument()
            expect(screen.getAllByRole('row')).toHaveLength(LAWYERS.length + 1)
            expect(screen.getByText(`${LAWYERS.length}`, { selector: '.vz-pager__count' })).toBeInTheDocument()
        })

        it('filtra con el buscador', async () => {
            const { user } = renderPage()
            await screen.findByText('Dr. Fernando G. Vázquez')

            await user.type(screen.getByRole('searchbox', { name: 'Buscar abogado' }), 'Ríos')

            // Mientras llega la búsqueda la tabla sigue mostrando lo anterior: hay que esperar.
            await waitFor(() =>
                expect(screen.queryByText('Dr. Fernando G. Vázquez')).not.toBeInTheDocument(),
            )
            expect(screen.getByText('Dra. Malena Ríos')).toBeInTheDocument()
        })

        /* Leer abogados está abierto a cualquier perfil (V3 D-03), así que el
           mock ya no responde 403 a un abogado: el rechazo se fuerza. */
        it('si el servidor rechaza la consulta, muestra el error', async () => {
            server.use(
                http.get('*/lawyers', () =>
                    HttpResponse.json(errorBody('FORBIDDEN', 'Rechazo de prueba.'), { status: 403 }),
                ),
            )
            renderPage()

            expect(await screen.findByText('No se pudieron cargar los abogados')).toBeInTheDocument()
        })
    })

    describe('alta', () => {
        it('registra el abogado, avisa y lo muestra en la tabla', async () => {
            const { user } = renderPage()
            await screen.findByText('Dr. Fernando G. Vázquez')

            const dialog = await openCreate(user)
            await user.type(within(dialog).getByLabelText(/^apellido y nombre/i), 'Dra. Ana Pérez')
            await user.type(within(dialog).getByLabelText(/^matrícula/i), '1-50000')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar abogado' }))

            expect(
                await screen.findByText('Abogado Dra. Ana Pérez registrado con matrícula 1-50000.'),
            ).toBeInTheDocument()
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(await screen.findByRole('cell', { name: 'Dra. Ana Pérez' })).toBeInTheDocument()
            expect(db.lawyers.some((l) => l.registrationNumber === '1-50000')).toBe(true)
        })

        it('enviado vacío marca los campos y no llama al servidor', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.click(within(dialog).getByRole('button', { name: 'Registrar abogado' }))

            expect(within(dialog).getByText('El apellido y nombre es obligatorio.')).toBeInTheDocument()
            expect(within(dialog).getByText('La matrícula es obligatoria.')).toBeInTheDocument()
            expect(db.lawyers).toHaveLength(LAWYERS.length)
        })

        it('una matrícula ya registrada se marca en el campo', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.type(within(dialog).getByLabelText(/^apellido y nombre/i), 'Otro Vázquez')
            await user.type(within(dialog).getByLabelText(/^matrícula/i), '1-28114')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar abogado' }))

            expect(
                await within(dialog).findByText(/matrícula/i, { selector: '.vz-error' }),
            ).toBeInTheDocument()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        it('si el servidor falla, avisa y deja el modal abierto', async () => {
            server.use(
                http.post('*/lawyers', () =>
                    HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), {
                        status: 500,
                    }),
                ),
            )
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.type(within(dialog).getByLabelText(/^apellido y nombre/i), 'Dra. Ana Pérez')
            await user.type(within(dialog).getByLabelText(/^matrícula/i), '1-50000')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar abogado' }))

            expect(await screen.findByText('Error del servidor de prueba.')).toBeInTheDocument()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
    })
})
