import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { CLIENTS, db, errorBody } from '@/shared/mocks'
import { formatDate, todayIsoDate } from '@/shared/lib/dates'
import { ClientsPage } from '@/features/clients/pages/ClientsPage'

/**
 * La pantalla Clientes: HU-8 (Registrar cliente) y HU-9 (Consultar clientes).
 * Cada test dice qué criterio de aceptación cubre.
 *
 * Los datos son los del mock: 23 clientes vigentes y uno dado de baja (SOSA).
 * Por apellido, la primera página termina en PAZ y la segunda tiene a PEREYRA,
 * QUIROGA y RUIZ.
 */

/** La Secretaría es el único perfil que opera la pantalla entera. */
function renderPage(as = 'gestion') {
    return renderWithProviders(<ClientsPage />, { as, path: '/clientes', route: '/clientes' })
}

type User = ReturnType<typeof renderPage>['user']

const FIRST = 'ACOSTA, Jonathan E.'
const ACTIVE_CLIENTS = CLIENTS.filter((c) => c.active).length

/** La fila de la tabla de ese cliente. */
function rowOf(name: string) {
    return screen.getByText(name).closest('tr') as HTMLElement
}

/** Los clientes que se ven, en el orden en que están en la tabla. */
function listedNames() {
    return screen.getAllByText(/^[A-ZÁÉÍÓÚÜÑ]+, /).map((el) => el.textContent)
}

async function openCreate(user: User) {
    await screen.findByText(FIRST)
    await user.click(screen.getByRole('button', { name: 'Registrar cliente' }))
    return screen.getByRole('dialog')
}

/** Completa el formulario con un cliente que cae en la primera página. */
async function fillValid(user: User, dialog: HTMLElement, dni = '35.778.120') {
    await user.type(within(dialog).getByLabelText(/^apellido/i), 'ALBORNOZ')
    await user.type(within(dialog).getByLabelText(/^nombres/i), 'Bruno')
    await user.type(within(dialog).getByLabelText(/^dni/i), dni)
}

describe('ClientsPage', () => {
    describe('listado (HU-9)', () => {
        /* CA-9.1, CA-9.2 y CA-9.3 */
        it('muestra los clientes vigentes por apellido, de a 20', async () => {
            renderPage()

            expect(await screen.findByText(FIRST)).toBeInTheDocument()
            expect(screen.getByRole('heading', { name: 'Clientes', level: 1 })).toBeInTheDocument()

            const names = listedNames()
            expect(names).toHaveLength(20)
            expect(names.slice(0, 3)).toEqual([FIRST, 'AGÜERO, Luciana B.', 'BARRIONUEVO, Héctor M.'])
            expect(names.at(-1)).toBe('PAZ, Ezequiel')
            expect(screen.getByText(`${ACTIVE_CLIENTS}`, { selector: '.vz-pager__count' })).toBeInTheDocument()
        })

        it('mientras carga, lo avisa', async () => {
            renderPage()

            expect(screen.getByText('Cargando clientes…')).toBeInTheDocument()
            // Se espera a que termine: si no, el pedido queda colgando para el test siguiente.
            expect(await screen.findByText(FIRST)).toBeInTheDocument()
        })

        /* CA-9.1, CA-8.5, CA-9.5 y CA-9.8 */
        it('muestra de cada cliente la fecha de alta, el DNI con puntos, el contacto y sus causas', async () => {
            renderPage()
            await screen.findByText(FIRST)

            // ACOSTA no tiene correo y lleva una causa activa.
            const acosta = within(rowOf(FIRST))
            expect(acosta.getByText('desde 19/01/2022')).toBeInTheDocument()
            expect(acosta.getByText('38.907.221')).toBeInTheDocument()
            expect(acosta.getByText('351 744-1160')).toBeInTheDocument()
            expect(acosta.getByText('—')).toBeInTheDocument()
            expect(acosta.getByText('1 causa')).toBeInTheDocument()

            // GÓMEZ tiene dos.
            expect(within(rowOf('GÓMEZ, Ariel Fernando')).getByText('2 causas')).toBeInTheDocument()
        })

        /* CA-9.6 */
        it('un cliente sin causas se muestra igual, como "Sin causas"', async () => {
            renderPage()
            await screen.findByText(FIRST)

            expect(within(rowOf('JUÁREZ, Mónica E.')).getByText('Sin causas')).toBeInTheDocument()
        })

        /* CA-9.3 */
        it('pasa de página con el paginado', async () => {
            const { user } = renderPage()
            await screen.findByText(FIRST)

            await user.click(screen.getByRole('button', { name: 'Siguiente' }))

            expect(await screen.findByText('PEREYRA, Marcos D.')).toBeInTheDocument()
            await waitFor(() => expect(screen.queryByText(FIRST)).not.toBeInTheDocument())
            expect(listedNames()).toEqual(['PEREYRA, Marcos D.', 'QUIROGA, Néstor A.', 'RUIZ, Elvira T.'])
        })

        /* CA-9.4 */
        it.each([
            ['apellido', 'gomez', 'GÓMEZ, Ariel Fernando'],
            ['nombres', 'silvia', 'LUDUEÑA, Silvia'],
            ['DNI', '34812905', 'GÓMEZ, Ariel Fernando'],
        ])('busca por %s', async (_, text, found) => {
            const { user } = renderPage()
            await screen.findByText(FIRST)

            await user.type(screen.getByRole('searchbox', { name: 'Buscar cliente' }), text)

            // Mientras llega la búsqueda la tabla sigue mostrando lo anterior: hay que esperar.
            await waitFor(() => expect(screen.queryByText(FIRST)).not.toBeInTheDocument())
            expect(listedNames()).toEqual([found])
        })

        it('al buscar vuelve a la primera página', async () => {
            const { user } = renderPage()
            await screen.findByText(FIRST)
            await user.click(screen.getByRole('button', { name: 'Siguiente' }))
            await screen.findByText('PEREYRA, Marcos D.')

            await user.type(screen.getByRole('searchbox', { name: 'Buscar cliente' }), 'acosta')

            // Si se quedara en la página 2, la búsqueda no mostraría nada.
            expect(await screen.findByText(FIRST)).toBeInTheDocument()
        })

        it('si la búsqueda no encuentra nada, muestra el estado vacío', async () => {
            const { user } = renderPage()
            await screen.findByText(FIRST)

            await user.type(screen.getByRole('searchbox', { name: 'Buscar cliente' }), 'zzzz')

            expect(await screen.findByText('Sin clientes')).toBeInTheDocument()
        })

        /* CA-9.11: SOSA está dada de baja y no hay forma de verla. */
        it('no muestra los clientes dados de baja ni ofrece un filtro para verlos', async () => {
            const { user } = renderPage()
            await screen.findByText(FIRST)

            await user.type(screen.getByRole('searchbox', { name: 'Buscar cliente' }), 'sosa')

            expect(await screen.findByText('Sin clientes')).toBeInTheDocument()
            expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
        })

        /* Leer clientes está abierto a cualquier perfil, así que el mock no
           responde 403: el rechazo se fuerza. */
        it('si el servidor rechaza la consulta, muestra el error', async () => {
            server.use(
                http.get('*/clients', () =>
                    HttpResponse.json(errorBody('FORBIDDEN', 'Rechazo de prueba.'), { status: 403 }),
                ),
            )
            renderPage()

            expect(await screen.findByText('No se pudieron cargar los clientes')).toBeInTheDocument()
            expect(screen.getByText('Rechazo de prueba.')).toBeInTheDocument()
        })

        /* CA-9.10 */
        it.each([
            ['el administrador', 'fvazquez'],
            ['un abogado', 'mrios'],
            ['la Secretaría', 'gestion'],
        ])('%s ve todos los clientes', async (_, username) => {
            renderPage(username)

            expect(await screen.findByText(FIRST)).toBeInTheDocument()
            expect(screen.getByText(`${ACTIVE_CLIENTS}`, { selector: '.vz-pager__count' })).toBeInTheDocument()
        })

        /* Fuera de alcance: modificar y eliminar son HU-10 y HU-11 (Sprint 4). */
        it('no ofrece modificar ni eliminar un cliente', async () => {
            renderPage()
            await screen.findByText(FIRST)

            expect(screen.queryByRole('button', { name: 'Modificar' })).not.toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
        })
    })

    describe('quién puede registrar (HU-8)', () => {
        /* CA-8.7: administrar clientes es sólo de la Secretaría (V3 D-05). */
        it.each([
            ['la Secretaría', 'gestion'],
            ['una secretaria que además es abogada', 'sledesma'],
        ])('%s tiene habilitado "Registrar cliente"', async (_, username) => {
            renderPage(username)
            await screen.findByText(FIRST)

            expect(screen.getByRole('button', { name: 'Registrar cliente' })).toBeEnabled()
        })

        it.each([
            ['el administrador', 'fvazquez'],
            ['un abogado', 'mrios'],
            ['un administrador que no ejerce', 'supervision'],
        ])('%s lo ve deshabilitado', async (_, username) => {
            const { user } = renderPage(username)
            await screen.findByText(FIRST)

            const button = screen.getByRole('button', { name: 'Registrar cliente' })
            expect(button).toBeDisabled()

            await user.click(button)
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
    })

    describe('alta (HU-8)', () => {
        /* CA-8.1 */
        it('abre el diálogo con los campos del cliente, vacíos', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            expect(within(dialog).getByRole('heading', { name: 'Registrar cliente' })).toBeInTheDocument()
            for (const label of [/^apellido/i, /^nombres/i, /^dni/i, /^teléfono/i, /^correo electrónico/i]) {
                expect(within(dialog).getByLabelText(label)).toHaveValue('')
            }
        })

        /* CA-8.2 y CA-8.5 */
        it('registra el cliente, avisa y lo muestra en la tabla, sin causas', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillValid(user, dialog)
            await user.type(within(dialog).getByLabelText(/^teléfono/i), '351 400-1122')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar cliente' }))

            expect(await screen.findByText('Cliente ALBORNOZ, Bruno registrado.')).toBeInTheDocument()
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

            // El listado se actualiza solo, con el cliente en su lugar alfabético.
            const row = within((await screen.findByText('ALBORNOZ, Bruno')).closest('tr') as HTMLElement)
            expect(row.getByText('35.778.120')).toBeInTheDocument()
            expect(row.getByText('351 400-1122')).toBeInTheDocument()
            expect(row.getByText('Sin causas')).toBeInTheDocument()
            // La fecha de alta la pone el backend: es la del día.
            expect(row.getByText(`desde ${formatDate(todayIsoDate())}`)).toBeInTheDocument()

            // El DNI viajó sin puntos, y el correo vacío no viajó.
            expect(db.clients.find((c) => c.lastName === 'ALBORNOZ')).toMatchObject({
                firstName: 'Bruno',
                dni: '35778120',
                phone: '351 400-1122',
                email: null,
                active: true,
            })
        })

        /* CA-8.3 */
        it('enviado vacío marca los obligatorios y no llama al servidor', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.click(within(dialog).getByRole('button', { name: 'Registrar cliente' }))

            expect(within(dialog).getByText('El apellido es obligatorio.')).toBeInTheDocument()
            expect(within(dialog).getByText('Los nombres son obligatorios.')).toBeInTheDocument()
            expect(within(dialog).getByText('El DNI es obligatorio.')).toBeInTheDocument()
            expect(db.clients).toHaveLength(CLIENTS.length)
        })

        /* CA-8.3 */
        it('un DNI o un correo con formato inválido se marcan antes de mandar', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillValid(user, dialog, '123')
            await user.type(within(dialog).getByLabelText(/^correo electrónico/i), 'no-es-un-correo')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar cliente' }))

            expect(within(dialog).getByText('El DNI tiene 7 u 8 números.')).toBeInTheDocument()
            expect(within(dialog).getByText('El formato del correo electrónico no es válido.')).toBeInTheDocument()
            expect(db.clients).toHaveLength(CLIENTS.length)
        })

        /* CA-8.4: el DNI de GÓMEZ. Es un 409, pero el problema es de un campo. */
        it('un DNI ya registrado se marca en el campo y deja el modal abierto', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillValid(user, dialog, '34.812.905')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar cliente' }))

            expect(
                await within(dialog).findByText('Ya existe un cliente registrado con ese DNI.'),
            ).toBeInTheDocument()
            expect(within(dialog).getByLabelText(/^dni/i).closest('.vz-field')).toHaveClass('vz-field--error')
            expect(screen.getByRole('dialog')).toBeInTheDocument()
            // Lo que ya se cargó no se pierde.
            expect(within(dialog).getByLabelText(/^apellido/i)).toHaveValue('ALBORNOZ')
            expect(db.clients).toHaveLength(CLIENTS.length)
        })

        /* CA-8.3: el backend valida igual, y sus errores van campo por campo. */
        it('si el servidor rechaza un campo, lo marca en el formulario', async () => {
            server.use(
                http.post('*/clients', () =>
                    HttpResponse.json(
                        errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                            email: 'Correo rechazado por el servidor.',
                        }),
                        { status: 400 },
                    ),
                ),
            )
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillValid(user, dialog)
            await user.click(within(dialog).getByRole('button', { name: 'Registrar cliente' }))

            expect(await within(dialog).findByText('Correo rechazado por el servidor.')).toBeInTheDocument()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        it('si el servidor falla, avisa y deja el modal abierto', async () => {
            server.use(
                http.post('*/clients', () =>
                    HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), {
                        status: 500,
                    }),
                ),
            )
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillValid(user, dialog)
            await user.click(within(dialog).getByRole('button', { name: 'Registrar cliente' }))

            expect(await screen.findByText('Error del servidor de prueba.')).toBeInTheDocument()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        it('cancelar cierra el modal sin registrar nada', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillValid(user, dialog)
            await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(db.clients).toHaveLength(CLIENTS.length)
        })

        it('al volver a abrirlo, el formulario está vacío', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)
            await fillValid(user, dialog)
            await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

            await user.click(screen.getByRole('button', { name: 'Registrar cliente' }))

            expect(within(screen.getByRole('dialog')).getByLabelText(/^apellido/i)).toHaveValue('')
        })
    })
})
