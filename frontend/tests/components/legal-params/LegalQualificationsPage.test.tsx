import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { LegalQualificationsPage } from '@/features/legal-params/pages/LegalQualificationsPage'

function renderPage() {
    return renderWithProviders(<LegalQualificationsPage />, { as: 'fvazquez', route: '/calificaciones-legales' })
}

type User = ReturnType<typeof renderPage>['user']

const FIRST = 'Abuso de armas — art. 104 CP'

async function openCreate(user: User) {
    await screen.findByRole('cell', { name: FIRST })
    await user.click(screen.getByRole('button', { name: 'Registrar calificación' }))
    return screen.getByRole('dialog')
}

async function fill(user: User, dialog: HTMLElement, name: string, years: string, months = '0') {
    const d = within(dialog)
    if (name) await user.type(d.getByLabelText(/^Nombre de la calificación legal/), name)
    if (years) await user.type(d.getByLabelText(/^Años/), years)
    await user.selectOptions(d.getByLabelText(/^Meses/), months)
}

describe('LegalQualificationsPage', () => {
    describe('consulta', () => {
        it('lista las vigentes en orden alfabético, sin acciones', async () => {
            renderPage()

            expect(await screen.findByRole('cell', { name: FIRST })).toBeInTheDocument()
            const vigentes = db.legalQualifications.filter((q) => q.active)
            expect(screen.getAllByRole('row')).toHaveLength(vigentes.length + 1)
            expect(screen.getAllByRole('row')[1]).toHaveTextContent(FIRST)
            expect(screen.queryByRole('button', { name: 'Modificar' })).not.toBeInTheDocument()
            expect(screen.queryByRole('cell', { name: 'Encubrimiento — art. 277 CP' })).not.toBeInTheDocument()
        })

        it('busca por nombre o artículo', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: FIRST })

            await user.type(screen.getByRole('searchbox', { name: 'Buscar calificación' }), 'art. 16')

            await waitFor(() => expect(screen.queryByRole('cell', { name: FIRST })).not.toBeInTheDocument())
            expect(screen.getByRole('cell', { name: 'Hurto simple — art. 162 CP' })).toBeInTheDocument()
            expect(screen.getByRole('cell', { name: 'Robo calificado — art. 167 inc. 2 CP' })).toBeInTheDocument()
        })

        it('una búsqueda sin resultados lo dice', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: FIRST })

            await user.type(screen.getByRole('searchbox', { name: 'Buscar calificación' }), 'zzz')

            expect(await screen.findByText('Ninguna calificación coincide con la búsqueda')).toBeInTheDocument()
        })

        it('si el servidor falla, muestra su mensaje', async () => {
            server.use(
                http.get('*/legal-qualifications', () =>
                    HttpResponse.json(errorBody('FORBIDDEN', 'Rechazo de prueba.'), { status: 403 }),
                ),
            )
            renderPage()

            expect(await screen.findByText('No se pudieron cargar las calificaciones')).toBeInTheDocument()
            expect(screen.getByText('Rechazo de prueba.')).toBeInTheDocument()
        })
    })

    describe('alta', () => {
        it('registra, avisa y la muestra en la tabla', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fill(user, dialog, 'Estafa — art. 172 CP', '6', '6')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar calificación' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Calificación registrada · prescripción 6 años y 6 meses.')
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(await screen.findByRole('cell', { name: 'Estafa — art. 172 CP' })).toBeInTheDocument()
        })

        it('enviado vacío marca los campos y no registra', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.click(within(dialog).getByRole('button', { name: 'Registrar calificación' }))

            expect(within(dialog).getByText('El nombre de la calificación es obligatorio.')).toBeInTheDocument()
            expect(within(dialog).getByText('Los años son obligatorios. Si el plazo es menor a un año, poné 0.')).toBeInTheDocument()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        it('un nombre que ya existe se marca en el campo', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fill(user, dialog, 'Hurto simple — art. 162 CP', '2')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar calificación' }))

            expect(await within(dialog).findByText('Ya existe una calificación legal con esa denominación.')).toBeInTheDocument()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        it('un 400 del servidor se marca en su campo', async () => {
            server.use(
                http.post('*/legal-qualifications', () =>
                    HttpResponse.json(
                        errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                            prescriptionMonths: 'Debe ser un número entero mayor o igual a 1.',
                        }),
                        { status: 400 },
                    ),
                ),
            )
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fill(user, dialog, 'Estafa — art. 172 CP', '6')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar calificación' }))

            expect(await within(dialog).findByText('Debe ser un número entero mayor o igual a 1.')).toBeInTheDocument()
        })

        it('otro error del servidor va a un aviso', async () => {
            server.use(
                http.post('*/legal-qualifications', () =>
                    HttpResponse.json(
                        errorBody('FORBIDDEN', 'Se requiere el rol ADMINISTRATOR para realizar esta operación.'),
                        { status: 403 },
                    ),
                ),
            )
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fill(user, dialog, 'Estafa — art. 172 CP', '6')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar calificación' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Se requiere el rol ADMINISTRATOR para realizar esta operación.')
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
    })
})
