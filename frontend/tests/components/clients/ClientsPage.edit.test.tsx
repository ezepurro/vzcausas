import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { ClientsPage } from '@/features/clients/pages/ClientsPage'

/**
 * Modificar cliente (HU-10), desde la acción "Modificar" de cada fila. Va en
 * su propio archivo para no pasar el techo de `ClientsPage.test.tsx`
 * (TESTING.md §4). Los campos y los textos salen del formulario "Modificar
 * cliente" del prototipo; el botón es "Guardar cambios", como en "Modificar
 * abogado" y "Modificar usuario".
 *
 * GÓMEZ (1) tiene DNI y dos causas activas (la 1 y la 17); NAVARRO (21) tiene
 * pasaporte. Los dos están en la primera página.
 *
 * @backend CA-10.2 CA-10.5 CA-10.8 CA-10.9 CA-10.10
 * (el dato se guarda una sola vez; la auditoría; `clientSince` no viaja nunca,
 * lo prueba `unit/clients/buildClientPatch`; la carátula y la carpeta de sus
 * causas las cambia el backend: que la pantalla las vuelva a pedir lo prueba
 * `clientMutations.cache.test.tsx`)
 */

function renderPage(as = 'gestion') {
    return renderWithProviders(<ClientsPage />, { as, path: '/clientes', route: '/clientes' })
}

type User = ReturnType<typeof renderPage>['user']

const GOMEZ = 'GÓMEZ, Ariel Fernando'
const NAVARRO = 'NAVARRO, Julio C.'

function rowOf(name: string) {
    return screen.getByText(name).closest('tr') as HTMLElement
}

async function openEdit(user: User, name = GOMEZ) {
    await screen.findByText(name)
    await user.click(within(rowOf(name)).getByRole('button', { name: 'Modificar' }))
    return screen.getByRole('dialog', { name: /Modificar cliente/ })
}

async function save(user: User, dialog: HTMLElement) {
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
}

const stored = (id: number) => db.clients.find((c) => c.id === id)

describe('ClientsPage · modificar cliente (HU-10)', () => {
    /* CA-10.6 y CA-11.6: modificar y dar de baja un cliente son de los tres
       perfiles (D-39). Alcanza con el de menos permisos (TESTING.md §5).
       Los dos botones de la fila salen del prototipo. */
    it.each([['la Secretaría', 'gestion'], ['un abogado', 'mrios']])(
        '%s tiene "Modificar" y "Eliminar" habilitados en cada fila',
        async (_, username) => {
            renderPage(username)
            await screen.findByText(GOMEZ)

            const row = within(rowOf(GOMEZ))
            expect(row.getByRole('button', { name: 'Modificar' })).toBeEnabled()
            expect(row.getByRole('button', { name: 'Eliminar' })).toBeEnabled()
        },
    )

    /* Prototipo: el subtítulo es el nombre y el documento, y el formulario abre cargado. */
    it('abre con los datos del cliente y su nombre y documento como subtítulo', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        expect(within(dialog).getByText('GÓMEZ, Ariel Fernando · DNI 34.812.905')).toBeInTheDocument()
        expect(within(dialog).getByLabelText(/^apellido/i)).toHaveValue('GÓMEZ')
        expect(within(dialog).getByLabelText(/^nombres/i)).toHaveValue('Ariel Fernando')
        expect(within(dialog).getByLabelText(/^tipo de documento/i)).toHaveValue('DNI')
        expect(within(dialog).getByLabelText(/^número de documento/i)).toHaveValue('34812905')
        expect(within(dialog).getByLabelText(/^dirección/i)).toHaveValue('Av. Colón 1250, Córdoba')
        expect(within(dialog).getByLabelText(/^teléfono/i)).toHaveValue('351 415-2288')
        expect(within(dialog).getByLabelText(/^correo electrónico/i)).toHaveValue('afgomez@gmail.com')
    })

    /* CA-10.1: los cambios quedan guardados y viaja sólo lo que cambió. */
    it('guarda el cambio, avisa y lo muestra en la tabla', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const phone = within(dialog).getByLabelText(/^teléfono/i)
        await user.clear(phone)
        await user.type(phone, '351 400-1122')
        await save(user, dialog)

        expect(await screen.findByText('Datos del cliente actualizados.')).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(await within(rowOf(GOMEZ)).findByText('351 400-1122')).toBeInTheDocument()
        expect(stored(1)).toMatchObject({ phone: '351 400-1122', address: 'Av. Colón 1250, Córdoba', clientSince: '2021-03-12' })
    })

    /* CA-10.1: una petición sin ningún campo es un 400, así que sin cambios no se llama. */
    it('guardar sin cambios cierra el diálogo y no llama al servidor', async () => {
        let called = false
        server.use(
            http.patch('*/clients/:clientId', () => {
                called = true
                return HttpResponse.json(errorBody('VALIDATION_ERROR', 'No debería llamarse.'), { status: 400 })
            }),
        )
        const { user } = renderPage()
        const dialog = await openEdit(user)

        await save(user, dialog)

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        expect(called).toBe(false)
    })

    /* CA-10.4: apellido, nombres, dirección y teléfono no se pueden vaciar (D-109). */
    it('vaciar los obligatorios no deja guardar y los marca en su campo', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        for (const label of [/^apellido/i, /^nombres/i, /^dirección/i, /^teléfono/i]) {
            await user.clear(within(dialog).getByLabelText(label))
        }
        await save(user, dialog)

        expect(within(dialog).getByText('El apellido es obligatorio.')).toBeInTheDocument()
        expect(within(dialog).getByText('Los nombres son obligatorios.')).toBeInTheDocument()
        expect(within(dialog).getByText('La dirección es obligatoria.')).toBeInTheDocument()
        expect(within(dialog).getByText('El teléfono es obligatorio.')).toBeInTheDocument()
        expect(stored(1)).toMatchObject({ lastName: 'GÓMEZ', phone: '351 415-2288' })
    })

    /* CA-10.3 (D-121): el tipo y el número de documento se pueden editar. */
    it('cambia el documento del cliente', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        expect(within(dialog).getByLabelText(/^tipo de documento/i)).toBeEnabled()
        const number = within(dialog).getByLabelText(/^número de documento/i)
        expect(number).toBeEnabled()
        await user.clear(number)
        await user.type(number, '35778120')
        await save(user, dialog)

        expect(await screen.findByText('Datos del cliente actualizados.')).toBeInTheDocument()
        expect(await within(rowOf(GOMEZ)).findByText('DNI 35.778.120')).toBeInTheDocument()
        expect(stored(1)).toMatchObject({ documentType: 'DNI', documentNumber: '35778120' })
    })

    /* CA-10.3: el número se valida contra el tipo que resulta del cambio. */
    it('pasar de pasaporte a DNI sin corregir el número lo marca en su campo', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user, NAVARRO)

        await user.selectOptions(within(dialog).getByLabelText(/^tipo de documento/i), 'DNI')
        await save(user, dialog)

        expect(within(dialog).getByText('El DNI tiene 7 u 8 números.')).toBeInTheDocument()
        expect(stored(21)).toMatchObject({ documentType: 'PASSPORT', documentNumber: 'AAE482915' })
    })

    /* CA-10.7: el documento de otro cliente vigente es un 409, y es de un campo. */
    it('un documento que ya tiene otro cliente se marca en su campo y deja el diálogo abierto', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const number = within(dialog).getByLabelText(/^número de documento/i)
        await user.clear(number)
        // El DNI de PEREYRA (2).
        await user.type(number, '29440117')
        await save(user, dialog)

        expect(await within(dialog).findByText('Ya existe un cliente registrado con ese DNI.')).toBeInTheDocument()
        expect(number.closest('.vz-field')).toHaveClass('vz-field--error')
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(stored(1)?.documentNumber).toBe('34812905')
    })

    /* CA-10.1: `email` en `null` lo borra; la tabla muestra la raya. */
    it('borrar el correo lo deja sin correo', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        await user.clear(within(dialog).getByLabelText(/^correo electrónico/i))
        await save(user, dialog)

        expect(await screen.findByText('Datos del cliente actualizados.')).toBeInTheDocument()
        expect(await within(rowOf(GOMEZ)).findByText('—')).toBeInTheDocument()
        expect(stored(1)?.email).toBeNull()
    })

    /* CA-10.11: lo dieron de baja mientras el diálogo estaba abierto. El texto
       del aviso es el del backend. */
    it('si el cliente ya no existe, avisa, cierra el diálogo y lo saca de la tabla', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const client = stored(1)
        if (client) client.active = false
        const phone = within(dialog).getByLabelText(/^teléfono/i)
        await user.clear(phone)
        await user.type(phone, '351 400-1122')
        await save(user, dialog)

        expect(await screen.findByText('No se encontró el cliente solicitado.')).toBeInTheDocument()
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        await waitFor(() => expect(screen.queryByText(GOMEZ)).not.toBeInTheDocument())
    })

    /* TESTING.md §11, mínimo por feature: el error del servidor. */
    it('si el servidor falla, avisa y deja el diálogo abierto', async () => {
        server.use(
            http.patch('*/clients/:clientId', () =>
                HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), { status: 500 }),
            ),
        )
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const phone = within(dialog).getByLabelText(/^teléfono/i)
        await user.clear(phone)
        await user.type(phone, '351 400-1122')
        await save(user, dialog)

        expect(await screen.findByText('Error del servidor de prueba.')).toBeInTheDocument()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(within(dialog).getByLabelText(/^teléfono/i)).toHaveValue('351 400-1122')
    })
})
