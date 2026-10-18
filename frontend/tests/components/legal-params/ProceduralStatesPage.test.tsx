import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { db, errorBody, toCase } from '@/shared/mocks'
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
        it('arranca en el fuero Penal con sus estados, en el orden en que se registraron', async () => {
            renderPage()

            expect(await screen.findByRole('cell', { name: 'Designación de abogado defensor' })).toBeInTheDocument()
            expect(screen.getByText('Ciclo de vida del fuero Penal')).toBeInTheDocument()
            expect(screen.getByRole('tab', { name: 'Penal' })).toHaveAttribute('aria-selected', 'true')

            const rows = screen.getAllByRole('row').slice(1)
            expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(
                criminalStates().map((s) => s.name),
            )
            // El estado inicial "Iniciada" es de sistema: no se lista (V3 D-34).
            expect(screen.queryByRole('cell', { name: 'Iniciada' })).not.toBeInTheDocument()
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

        /* Leer los estados está abierto a cualquier perfil (V3 D-03), así que
           el mock ya no responde 403 a un abogado: el rechazo se fuerza. */
        it('si el servidor rechaza la consulta, muestra el error', async () => {
            server.use(
                http.get('*/procedural-states', () =>
                    HttpResponse.json(errorBody('FORBIDDEN', 'Rechazo de prueba.'), { status: 403 }),
                ),
            )
            renderPage()

            expect(await screen.findByText('No se pudieron cargar los estados')).toBeInTheDocument()
        })
    })

    describe('alta', () => {
        it('registra el estado, lo avisa y lo suma al final del listado', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.type(within(dialog).getByLabelText(/^nombre del estado/i), 'Queja')
            await user.type(within(dialog).getByLabelText(/^días/i), '5')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar estado' }))

            expect(
                await screen.findByText('Estado "Queja" agregado al ciclo de vida del fuero Penal.'),
            ).toBeInTheDocument()
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(db.proceduralStates.find((s) => s.name === 'Queja')).toMatchObject({
                jurisdiction: 'CRIMINAL',
                timeLimitDays: 5,
                dayType: 'BUSINESS',
            })
            // Se listan por orden de registro: el nuevo queda último (V3 D-31).
            await screen.findByRole('cell', { name: 'Queja' })
            const names = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent)
            expect(names.at(-1)).toBe('Queja')
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
            // Sólo cambió el nombre: el plazo quedó como estaba.
            expect(db.proceduralStates.find((s) => s.id === 2)).toMatchObject({
                name: 'Cédula de notificación electrónica',
                timeLimitDays: 3,
                dayType: 'BUSINESS',
            })
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

        /* La baja procede aunque haya causas en el estado (V3 D-06): ya no hay
           409. La causa que estaba en él lo conserva. */
        it('un estado con causas también se elimina, y la causa lo conserva', async () => {
            const { user } = renderPage()
            const name = 'Oposición al requerimiento de elevación'
            await screen.findByRole('cell', { name })

            await user.click(within(rowOf(name)).getByRole('button', { name: 'Eliminar' }))
            const dialog = screen.getByRole('dialog')
            expect(dialog).toHaveTextContent('Hay 1 causa en este estado')
            await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

            expect(await screen.findByText(`Estado "${name}" eliminado del fuero Penal.`)).toBeInTheDocument()
            await waitFor(() => expect(screen.queryByRole('cell', { name })).not.toBeInTheDocument())
            expect(db.proceduralStates.find((s) => s.id === 4)?.active).toBe(false)
            expect(toCase(db.cases[0]).currentState.name).toBe(name)
        })
    })
})
