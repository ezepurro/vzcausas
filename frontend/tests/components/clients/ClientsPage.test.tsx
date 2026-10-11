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

/*
 * @backend CA-9.10 CA-9.11
 * Del backend y no se prueban acá: que todos los perfiles vean todos los
 * clientes (CA-9.10) y que los dados de baja no lleguen al listado (CA-9.11).
 * La pantalla muestra lo que recibe; que cada perfil entre a la sección lo
 * prueba `unit/app/access`.
 */
describe('ClientsPage', () => {
    describe('listado (HU-9)', () => {
        /* CA-9.1, CA-9.2 y CA-9.3; CA-8.6: el apellido primero. */
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

        /* CA-9.1, CA-8.5, CA-9.5, CA-9.6 (las causas en palabras) y CA-9.8 */
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

        /* CA-9.4 */
        it.each([
            ['DNI', '34812905', 'GÓMEZ, Ariel Fernando'],
        ])('busca por %s', async (_, text, found) => {
            const { user } = renderPage()
            await screen.findByText(FIRST)

            await user.type(screen.getByRole('searchbox', { name: 'Buscar cliente' }), text)

            // Mientras llega la búsqueda la tabla sigue mostrando lo anterior: hay que esperar.
            await waitFor(() => expect(screen.queryByText(FIRST)).not.toBeInTheDocument())
            expect(listedNames()).toEqual([found])
        })

        it('si la búsqueda no encuentra nada, muestra el estado vacío', async () => {
            const { user } = renderPage()
            await screen.findByText(FIRST)

            await user.type(screen.getByRole('searchbox', { name: 'Buscar cliente' }), 'zzzz')

            expect(await screen.findByText('Sin clientes')).toBeInTheDocument()
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
    })

    describe('quién puede registrar (HU-8)', () => {
        /* CA-8.7: administrar clientes es sólo de la Secretaría (V3 D-05). */
        it.each([
            ['la Secretaría', 'gestion'],
        ])('%s tiene habilitado "Registrar cliente"', async (_, username) => {
            renderPage(username)
            await screen.findByText(FIRST)

            expect(screen.getByRole('button', { name: 'Registrar cliente' })).toBeEnabled()
        })
    })

    describe('alta (HU-8)', () => {
        /* CA-8.1, CA-8.2 y CA-8.5: el diálogo abre con los cinco campos, se completan y se registra. */
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
            // `FormModal` lleva al primer campo con error.
            expect(within(dialog).getByLabelText(/^apellido/i)).toHaveFocus()
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
            // También cuando el error llega del servidor.
            await waitFor(() => expect(within(dialog).getByLabelText(/^dni/i)).toHaveFocus())
            expect(screen.getByRole('dialog')).toBeInTheDocument()
            // Lo que ya se cargó no se pierde.
            expect(within(dialog).getByLabelText(/^apellido/i)).toHaveValue('ALBORNOZ')
            expect(db.clients).toHaveLength(CLIENTS.length)
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
    })
})
