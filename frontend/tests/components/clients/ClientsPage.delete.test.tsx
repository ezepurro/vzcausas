import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { ClientsPage } from '@/features/clients/pages/ClientsPage'
import { ClientActiveCases } from '@/features/cases'

/**
 * Dar de baja un cliente (HU-11), desde la acción "Eliminar" de cada fila.
 * Los textos salen del diálogo "Eliminar cliente" del prototipo: el nombre
 * como subtítulo, "Motivo (opcional)" y el botón "Eliminar".
 *
 * Con causas activas no procede (`409 CLIENT_HAS_ACTIVE_CASES`, D-122): el
 * prototipo deja eliminar, y manda el contrato. Como el 409 no trae la lista,
 * la pantalla muestra las causas activas con `ClientActiveCases`, que publica
 * `cases` (`clients` no puede importar de `cases`: la flecha va al revés, así
 * que la página lo recibe en `renderActiveCases` y lo enchufa el router).
 *
 * Las semillas: JUÁREZ (18) no tiene causas; ESCUDERO (13) tiene sólo la 10,
 * en "Prescripta"; GÓMEZ (1) tiene dos activas, la 1 y la 17.
 *
 * @backend CA-11.3 CA-11.4 CA-11.5 CA-11.8
 * (que no se pueda registrar una causa con su `clientId`, que sus causas
 * terminales lo sigan mostrando sin marca, la auditoría y el documento
 * liberado los resuelve el backend; que deje de aparecer en el selector de
 * "Registrar causa" lo prueba `clientMutations.cache.test.tsx`)
 */

function renderPage(as = 'gestion') {
    return renderWithProviders(
        <ClientsPage renderActiveCases={(clientId) => <ClientActiveCases clientId={clientId} />} />,
        { as, path: '/clientes', route: '/clientes' },
    )
}

type User = ReturnType<typeof renderPage>['user']

const GOMEZ = 'GÓMEZ, Ariel Fernando'
const JUAREZ = 'JUÁREZ, Mónica E.'
const ESCUDERO = 'ESCUDERO, Raúl O.'

function rowOf(name: string) {
    return screen.getByText(name).closest('tr') as HTMLElement
}

async function openDelete(user: User, name: string) {
    await screen.findByText(name)
    await user.click(within(rowOf(name)).getByRole('button', { name: 'Eliminar' }))
    return screen.getByRole('dialog', { name: /Eliminar cliente/ })
}

async function confirm(user: User, dialog: HTMLElement) {
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
}

const stored = (id: number) => db.clients.find((c) => c.id === id)

describe('ClientsPage · dar de baja un cliente (HU-11)', () => {
    /* Prototipo y CA-11.7: el diálogo lleva el nombre y el motivo opcional. */
    it('abre "Eliminar cliente" con el nombre y el motivo opcional', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, JUAREZ)

        expect(within(dialog).getByText(JUAREZ)).toBeInTheDocument()
        expect(within(dialog).getByLabelText(/^motivo \(opcional\)/i)).toHaveValue('')
        expect(within(dialog).getByLabelText(/^motivo \(opcional\)/i)).toHaveAttribute('maxlength', '500')
    })

    /* CA-11.1 y CA-11.7: sin motivo se registra igual; la baja es lógica. */
    it('da de baja un cliente sin causas, avisa y lo saca de la tabla', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, JUAREZ)

        await confirm(user, dialog)

        expect(await screen.findByText('Cliente eliminado. El historial se conserva.')).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        await waitFor(() => expect(screen.queryByText(JUAREZ)).not.toBeInTheDocument())
        // No se borra: queda con `active: false` (RN12).
        expect(stored(18)).toMatchObject({ active: false })
    })

    /* CA-11.2: las causas terminales no impiden la baja. CA-11.5 y CA-11.7: el motivo viaja. */
    it('da de baja un cliente con causas sólo terminales, con su motivo', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, ESCUDERO)

        await user.type(within(dialog).getByLabelText(/^motivo \(opcional\)/i), 'Cliente cargado dos veces.')
        await confirm(user, dialog)

        expect(await screen.findByText('Cliente eliminado. El historial se conserva.')).toBeInTheDocument()
        expect(stored(13)).toMatchObject({ active: false, deactivation: { reason: 'Cliente cargado dos veces.' } })
    })

    /* CA-11.2: con causas activas responde 409, no cambia nada y muestra sus
       causas activas, sin las terminales. Se le pasa a GÓMEZ la 9, que está
       "Archivada", para ver que no se lista. */
    it('con causas activas no lo da de baja y muestra cuáles son', async () => {
        const archived = db.cases.find((c) => c.id === 9)
        if (archived) archived.clientId = 1
        const { user } = renderPage()
        const dialog = await openDelete(user, GOMEZ)

        await confirm(user, dialog)

        expect(
            await within(dialog).findByText('No se puede dar de baja el cliente porque tiene causas activas.'),
        ).toBeInTheDocument()
        expect(await within(dialog).findByText('GÓMEZ, Ariel Fernando p.s.a. Robo calificado')).toBeInTheDocument()
        expect(within(dialog).getByText('GÓMEZ, Ariel Fernando p.s.a. Amenazas coactivas')).toBeInTheDocument()
        expect(within(dialog).queryByText('BARRIONUEVO, Héctor M. p.s.a. Hurto simple')).not.toBeInTheDocument()

        // La fila sigue en la tabla y el cliente sigue vigente. El nombre está
        // también en el subtítulo del diálogo: se busca el de la tabla.
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(await screen.findByText(GOMEZ, { selector: '.vz-table__primary' })).toBeInTheDocument()
        expect(stored(1)?.active).toBe(true)
    })

    /* CA-11.9: ya lo dieron de baja. El texto del aviso es el del backend. */
    it('si el cliente ya no existe, avisa, cierra el diálogo y lo saca de la tabla', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, JUAREZ)

        const client = stored(18)
        if (client) client.active = false
        await confirm(user, dialog)

        expect(await screen.findByText('No se encontró el cliente solicitado.')).toBeInTheDocument()
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        await waitFor(() => expect(screen.queryByText(JUAREZ)).not.toBeInTheDocument())
    })

    /* TESTING.md §11, mínimo por feature: el error del servidor. */
    it('si el servidor falla, avisa y el cliente sigue en la tabla', async () => {
        server.use(
            http.delete('*/clients/:clientId', () =>
                HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), { status: 500 }),
            ),
        )
        const { user } = renderPage()
        const dialog = await openDelete(user, JUAREZ)

        await confirm(user, dialog)

        expect(await screen.findByText('Error del servidor de prueba.')).toBeInTheDocument()
        expect(await screen.findByText(JUAREZ, { selector: '.vz-table__primary' })).toBeInTheDocument()
        expect(stored(18)?.active).toBe(true)
    })
})
