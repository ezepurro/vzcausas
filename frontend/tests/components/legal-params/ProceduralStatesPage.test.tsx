import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { ProceduralStatesPage } from '@/features/legal-params/pages/ProceduralStatesPage'

function renderPage(as = 'fvazquez') {
    return renderWithProviders(<ProceduralStatesPage />, { as, route: '/estados-y-plazos' })
}

type User = ReturnType<typeof renderPage>['user']

/** La fila de la tabla que contiene ese nombre. */
function rowOf(name: string) {
    return screen.getByRole('cell', { name }).closest('tr') as HTMLElement
}

async function openCreate(user: User) {
    await screen.findByRole('cell', { name: 'Cédula de notificación' })
    await user.click(screen.getByRole('button', { name: 'Registrar estado' }))
    return screen.getByRole('dialog')
}

const criminalStates = () => db.proceduralStates.filter((s) => s.jurisdiction === 'CRIMINAL' && s.active)

describe('ProceduralStatesPage', () => {
    describe('listado', () => {
        it('arranca en el fuero Penal con su ciclo en orden', async () => {
            renderPage()

            expect(await screen.findByRole('cell', { name: 'Designación de abogado defensor' })).toBeInTheDocument()
            expect(screen.getByText('Ciclo de vida del fuero Penal')).toBeInTheDocument()
            expect(screen.getByRole('tab', { name: 'Penal' })).toHaveAttribute('aria-selected', 'true')
            expect(screen.getAllByRole('row')).toHaveLength(criminalStates().length + 1)
        })

        it('cambiar de pestaña muestra el ciclo de otro fuero', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'Cédula de notificación' })

            await user.click(screen.getByRole('tab', { name: 'Administrativo' }))

            expect(await screen.findByRole('cell', { name: 'Presentación de descargo' })).toBeInTheDocument()
            expect(screen.queryByRole('cell', { name: 'Cédula de notificación' })).not.toBeInTheDocument()
            expect(screen.getByText('Ciclo de vida del fuero Administrativo')).toBeInTheDocument()
        })

        it('filtra con el buscador', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'Cédula de notificación' })

            await user.type(screen.getByRole('searchbox', { name: 'Buscar estado procesal' }), 'recurso')

            await waitFor(() =>
                expect(screen.queryByRole('cell', { name: 'Cédula de notificación' })).not.toBeInTheDocument(),
            )
            expect(screen.getByRole('cell', { name: 'Recurso de apelación' })).toBeInTheDocument()
            expect(screen.getByRole('cell', { name: 'Recurso de casación' })).toBeInTheDocument()
        })

        it('si la búsqueda no encuentra nada, muestra el estado vacío', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'Cédula de notificación' })

            await user.type(screen.getByRole('searchbox', { name: 'Buscar estado procesal' }), 'zzzz')

            expect(await screen.findByText('Sin estados procesales')).toBeInTheDocument()
        })

        it('si no tiene permiso, muestra el error', async () => {
            renderPage('mrios')

            expect(await screen.findByText('No se pudieron cargar los estados')).toBeInTheDocument()
        })
    })

    describe('alta', () => {
        it('registra el estado al final del ciclo y lo avisa', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.type(within(dialog).getByLabelText(/^nombre del estado/i), 'Queja')
            await user.type(within(dialog).getByLabelText(/^días/i), '5')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar estado' }))

            const last = criminalStates().length
            expect(
                await screen.findByText(`Estado "Queja" agregado al fuero Penal, en la posición ${last}.`),
            ).toBeInTheDocument()
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(db.proceduralStates.find((s) => s.name === 'Queja')).toMatchObject({
                jurisdiction: 'CRIMINAL',
                timeLimitDays: 5,
                dayType: 'BUSINESS',
            })
        })

        it('registra el estado en el lugar elegido', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.type(within(dialog).getByLabelText(/^nombre del estado/i), 'Queja')
            await user.selectOptions(within(dialog).getByLabelText(/dónde va este estado/i), 'Al inicio del ciclo')
            await user.type(within(dialog).getByLabelText(/^días/i), '5')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar estado' }))

            expect(
                await screen.findByText('Estado "Queja" agregado al fuero Penal, en la posición 1.'),
            ).toBeInTheDocument()
        })

        it('con plazo 0 esconde el tipo de día y lo guarda como sin plazo', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.type(within(dialog).getByLabelText(/^nombre del estado/i), 'Queja')
            await user.type(within(dialog).getByLabelText(/^días/i), '0')

            expect(within(dialog).queryByLabelText(/se cuentan en días/i)).not.toBeInTheDocument()

            await user.click(within(dialog).getByRole('button', { name: 'Registrar estado' }))

            await screen.findByText(/Estado "Queja" agregado/)
            expect(db.proceduralStates.find((s) => s.name === 'Queja')).toMatchObject({
                timeLimitDays: 0,
                dayType: 'NONE',
            })
        })

        it('enviado vacío marca los campos y no llama al servidor', async () => {
            const { user } = renderPage()
            const before = db.proceduralStates.length
            const dialog = await openCreate(user)

            await user.click(within(dialog).getByRole('button', { name: 'Registrar estado' }))

            expect(within(dialog).getByText('El nombre del estado es obligatorio.')).toBeInTheDocument()
            expect(
                within(dialog).getByText('El plazo es obligatorio. Poné 0 si el estado no abre plazo.'),
            ).toBeInTheDocument()
            expect(db.proceduralStates).toHaveLength(before)
        })

        it('un nombre que ya existe en el fuero se marca en el campo', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.type(within(dialog).getByLabelText(/^nombre del estado/i), 'Archivada')
            await user.type(within(dialog).getByLabelText(/^días/i), '0')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar estado' }))

            await waitFor(() =>
                expect(within(dialog).getByLabelText(/^nombre del estado/i).closest('.vz-field')).toHaveClass(
                    'vz-field--error',
                ),
            )
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        it('si el servidor falla, avisa y deja el modal abierto', async () => {
            server.use(
                http.post('*/procedural-states', () =>
                    HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), {
                        status: 500,
                    }),
                ),
            )
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.type(within(dialog).getByLabelText(/^nombre del estado/i), 'Queja')
            await user.type(within(dialog).getByLabelText(/^días/i), '5')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar estado' }))

            expect(await screen.findByText('Error del servidor de prueba.')).toBeInTheDocument()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
    })

    describe('edición', () => {
        it('precarga el estado y guarda sólo lo que cambió', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'Cédula de notificación' })

            await user.click(within(rowOf('Cédula de notificación')).getByRole('button', { name: 'Modificar' }))
            const dialog = screen.getByRole('dialog')

            const name = within(dialog).getByLabelText(/^nombre del estado/i)
            expect(name).toHaveValue('Cédula de notificación')
            expect(within(dialog).getByLabelText(/^días/i)).toHaveValue('3')

            await user.clear(name)
            await user.type(name, 'Cédula de notificación electrónica')
            await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

            expect(
                await screen.findByText('Estado "Cédula de notificación electrónica" actualizado.'),
            ).toBeInTheDocument()
            // No se tocó la posición: el estado sigue en su lugar.
            expect(db.proceduralStates.find((s) => s.id === 2)).toMatchObject({
                name: 'Cédula de notificación electrónica',
                position: 2,
            })
        })

        it('sin cambios cierra el modal sin llamar al servidor', async () => {
            let patched = false
            server.use(
                http.patch('*/procedural-states/:id', () => {
                    patched = true
                    return HttpResponse.json({})
                }),
            )
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'Cédula de notificación' })

            await user.click(within(rowOf('Cédula de notificación')).getByRole('button', { name: 'Modificar' }))
            await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(patched).toBe(false)
        })
    })

    describe('eliminación', () => {
        it('elimina el estado, avisa y lo saca de la tabla', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'Cédula de notificación' })

            await user.click(within(rowOf('Cédula de notificación')).getByRole('button', { name: 'Eliminar' }))
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }))

            expect(
                await screen.findByText('Estado "Cédula de notificación" eliminado del fuero Penal.'),
            ).toBeInTheDocument()
            await waitFor(() =>
                expect(screen.queryByRole('cell', { name: 'Cédula de notificación' })).not.toBeInTheDocument(),
            )
        })

        it('si el estado tiene causas asociadas, avisa el error y no lo elimina', async () => {
            const { user } = renderPage()
            const name = 'Oposición al requerimiento de elevación'
            await screen.findByRole('cell', { name })

            await user.click(within(rowOf(name)).getByRole('button', { name: 'Eliminar' }))
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }))

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
            expect(await screen.findByRole('alert')).toBeInTheDocument()
            expect(screen.getByRole('cell', { name })).toBeInTheDocument()
            expect(db.proceduralStates.find((s) => s.id === 4)?.active).toBe(true)
        })

        it('cancelar no elimina nada', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'Cédula de notificación' })

            await user.click(within(rowOf('Cédula de notificación')).getByRole('button', { name: 'Eliminar' }))
            await user.click(screen.getByRole('button', { name: 'Cancelar' }))

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(db.proceduralStates.find((s) => s.id === 2)?.active).toBe(true)
        })
    })
})
