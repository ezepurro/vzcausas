import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { personNameIn } from '../../setup/names'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * Modificar causa (HU-19), con el botón "Modificar causa" del detalle. Los
 * textos salen del formulario del prototipo: título "Modificar causa",
 * "Guardar cambios" y el aviso "Causa actualizada. El cambio queda asentado
 * con usuario y fecha.".
 *
 * La causa 1 es penal, con SAC 13284571 y cliente GÓMEZ; la lleva `mrios`.
 * Se modifica como `gestion`: la Secretaría opera cualquier causa (D-110).
 * La causa 4 (SAC 11845620) la lleva `fvazquez`: `mrios`, que sólo es
 * abogado, no la puede modificar.
 *
 * Viaja sólo lo que cambió (decisión del 28/10/2026, TESTING.md §11): sin
 * cambios, "Guardar cambios" cierra el diálogo sin llamar a la API.
 *
 * @backend CA-19.4 CA-19.6 CA-19.9 CA-19.10 CA-19.11 CA-19.12 CA-19.13 CA-19.14 CA-19.15
 * (datos de otro fuero, SAC ↔ fecha de inicio, carpeta en Drive, recálculos,
 * causa prescripta, causa dada de baja y auditoría los resuelve el servidor;
 * la pantalla muestra su respuesta, como en el último test)
 */

function renderPage(caseId: number, as = 'gestion') {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
    })
}

const headerOf = (name: string) => screen.findByRole('region', { name })

async function openEdit(user: ReturnType<typeof renderPage>['user']) {
    await headerOf('Causa 13284571')
    await user.click(screen.getByRole('button', { name: 'Modificar causa' }))
    return screen.getByRole('dialog', { name: /Modificar causa/ })
}

describe('CaseDetailPage · modificar causa', () => {
    usePrototypeToday()

    // CA-19.1: la Secretaría opera cualquier causa (D-110).
    it('la Secretaría corrige un dato y el detalle lo muestra', async () => {
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        const court = within(dialog).getByLabelText(/^órgano interviniente/i)
        await user.clear(court)
        await user.type(court, 'Fisc. de Distrito I, 3º turno')
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        expect(await screen.findByText('Causa actualizada. El cambio queda asentado con usuario y fecha.')).toBeInTheDocument()
        expect(screen.getByText('Fisc. de Distrito I, 3º turno')).toBeInTheDocument()
    })

    /* H-30 de `docs/auditoria-front`: "Modificar causa" no ofrecía registrar
       una calificación. El alta se abre encima del diálogo, y Escape cierra
       sólo el de arriba (H-06). */
    it('registra una calificación nueva desde el diálogo y la agrega a la causa', async () => {
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        await user.click(within(dialog).getByRole('button', { name: 'Registrar calificación nueva' }))
        const creating = screen.getByRole('dialog', { name: /calificación/i })
        await user.type(within(creating).getByLabelText(/^Nombre de la calificación legal/), 'Estafa — art. 172 CP')
        await user.type(within(creating).getByLabelText(/^Años/), '6')
        await user.click(within(creating).getByRole('button', { name: 'Registrar calificación' }))

        expect(await within(dialog).findByLabelText(/^Fecha del hecho de Estafa — art\. 172 CP/)).toBeInTheDocument()
        expect(screen.getAllByRole('dialog')).toHaveLength(1)
        expect(screen.queryByText('Calificación dada de baja')).not.toBeInTheDocument()
    })

    it('Escape sobre "Registrar calificación nueva" no cierra "Modificar causa"', async () => {
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        await user.click(within(dialog).getByRole('button', { name: 'Registrar calificación nueva' }))
        expect(screen.getAllByRole('dialog')).toHaveLength(2)

        await user.keyboard('{Escape}')

        expect(screen.getAllByRole('dialog')).toHaveLength(1)
        expect(screen.getByRole('dialog', { name: /Modificar causa/ })).toBeInTheDocument()
    })

    // CA-19.2: nunca sale un PATCH vacío. Sin cambios, el diálogo se cierra sin aviso.
    it('guardar sin cambios cierra el diálogo sin llamar al servidor', async () => {
        let patched = false
        server.use(
            http.patch('*/cases/:caseId', () => {
                patched = true
                return HttpResponse.json(errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.'), { status: 400 })
            }),
        )
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        await waitFor(() => expect(screen.queryByRole('dialog', { name: /Modificar causa/ })).not.toBeInTheDocument())
        expect(patched).toBe(false)
        expect(screen.queryByText('Causa actualizada. El cambio queda asentado con usuario y fecha.')).not.toBeInTheDocument()
    })

    // CA-19.8 (RN3): cualquier perfil cambia el responsable, y el detalle muestra al nuevo.
    it('cambiar el abogado responsable lo guarda y el detalle muestra al nuevo', async () => {
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        const lawyer = within(dialog).getByLabelText(/^abogado responsable/i)
        await user.selectOptions(lawyer, within(lawyer).getByRole('option', { name: /Bustos/ }))
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        await screen.findByText('Causa actualizada. El cambio queda asentado con usuario y fecha.')
        expect(db.cases.find((c) => c.id === 1)?.responsibleLawyerId).toBe(5)
        await waitFor(async () =>
            expect(await headerOf('Causa 13284571')).toHaveTextContent(
                new RegExp(`Responsable ${personNameIn('Bustos', 'Carolina')}`),
            ),
        )
    })

    // CA-19.3 (D-95): el fuero se muestra, pero no se modifica.
    it('el fuero no se puede cambiar y lo explica', async () => {
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        expect(
            within(dialog).getByText('No se modifica. Si la causa se registró en otro fuero, dala de baja y registrala de nuevo.'),
        ).toBeInTheDocument()
        expect(within(dialog).queryByRole('combobox', { name: /^fuero/i })).not.toBeInTheDocument()
        // Deshabilitado, no sólo de lectura: se ve bloqueado y no toma el foco.
        expect(within(dialog).getByRole('textbox', { name: /^fuero/i })).toBeDisabled()
    })

    // CA-19.5: el SAC de otra causa vigente se marca en su campo.
    it('un SAC que ya tiene otra causa se rechaza en su campo', async () => {
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        const sac = within(dialog).getByLabelText(/^n° de sac/i)
        await user.clear(sac)
        await user.type(sac, '12907344')
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        expect(await within(dialog).findByText('Ya existe una causa registrada con ese número de SAC.')).toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 1)?.sacNumber).toBe('13284571')
    })

    // CA-19.7 (D-111): el cliente se muestra, pero no se modifica, como el fuero.
    it('el cliente no se puede cambiar y lo explica', async () => {
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        expect(
            within(dialog).getByText('No se modifica. Si la causa se registró con otro cliente, dala de baja y registrala de nuevo.'),
        ).toBeInTheDocument()
        expect(within(dialog).queryByRole('combobox', { name: /^cliente/i })).not.toBeInTheDocument()
        const client = within(dialog).getByRole('textbox', { name: /^cliente/i })
        expect(client).toBeDisabled()
        expect(client).toHaveValue('GÓMEZ, Ariel Fernando · DNI 34.812.905')
    })

    // CA-19.7 (D-111): el cliente no viaja en el PATCH.
    it('guardar un cambio no manda el cliente', async () => {
        let body: Record<string, unknown> | null = null
        server.use(
            http.patch('*/cases/:caseId', async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json(errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.'), { status: 400 })
            }),
        )
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        await user.type(within(dialog).getByLabelText(/^interno/i), '5')
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        await waitFor(() => expect(body).not.toBeNull())
        expect(body).not.toHaveProperty('clientId')
    })

    // CA-19.16 (D-110): un abogado que no es el responsable no la modifica.
    it('un abogado que no es el responsable ve "Modificar causa" deshabilitado', async () => {
        renderPage(4, 'mrios')
        await headerOf('Causa 11845620')

        const button = screen.getByRole('button', { name: 'Modificar causa' })
        expect(button).toBeDisabled()
        expect(button).toHaveAttribute('title', expect.stringMatching(/^Solo el abogado responsable/))
    })

    // CA-19.1 (D-110): el responsable modifica su causa aunque sólo sea abogado.
    it('el abogado responsable puede abrir "Modificar causa"', async () => {
        const { user } = renderPage(1, 'mrios')
        const dialog = await openEdit(user)

        expect(dialog).toBeInTheDocument()
    })

    // Mínimo por feature (TESTING.md §11): el error del servidor se muestra.
    it('si el servidor rechaza el cambio, muestra su mensaje', async () => {
        server.use(
            http.patch('*/cases/:caseId', () =>
                HttpResponse.json(
                    errorBody('CASE_IN_TERMINAL_STATE', 'La causa está prescripta: no se pueden cambiar sus calificaciones legales.'),
                    { status: 422 },
                ),
            ),
        )
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        await user.type(within(dialog).getByLabelText(/^interno/i), '5')
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        expect(
            await screen.findByText('La causa está prescripta: no se pueden cambiar sus calificaciones legales.'),
        ).toBeInTheDocument()
    })

    /* "Asignarme a mí" (cases/CAMBIOS.md): el Administrador que también es
       abogado ve su ficha primero; el responsable actual sigue elegido. */
    it('a quien es abogado le ofrece primero su ficha, y el responsable actual sigue elegido', async () => {
        const { user } = renderPage(1, 'fvazquez')
        const dialog = await openEdit(user)

        const select = within(dialog).getByLabelText(/^Abogado responsable/)
        const mine = await within(select).findByRole('option', { name: /\(asignarme a mí\)$/ })
        expect(within(select).getAllByRole('option')[0]).toBe(mine)
        expect(mine).toHaveTextContent(/^Vázquez, Fernando/)
        expect(select).toHaveValue('3')
    })

    /* D-113, CA-33.18: una calificación declarada prescripta no se quita ni cambia su
       fecha del hecho. El servidor lo rechaza (422); la pantalla no lo ofrece. Causa 13
       (de mferreyra) con Amenazas coactivas declarada. */
    it('una calificación declarada prescripta no ofrece "Quitar" y su fecha del hecho queda bloqueada', async () => {
        db.cases.find((c) => c.id === 13)!.qualifications.find((q) => q.legalQualificationId === 4)!.prescriptionDeclaration = {
            prescriptionDate: '2026-09-10',
            resolution: 'Auto N° 88',
            grounds: null,
            registeredById: 6,
            registeredAt: '2026-09-10T12:00:00-03:00',
        }
        const { user } = renderPage(13, 'mferreyra')
        await headerOf('Causa 12660318')
        await user.click(screen.getByRole('button', { name: 'Modificar causa' }))
        const dialog = screen.getByRole('dialog', { name: /Modificar causa/ })

        expect(within(dialog).queryByRole('button', { name: /^Quitar Amenazas coactivas/ })).not.toBeInTheDocument()
        expect(within(dialog).getByLabelText(/^Fecha del hecho de Amenazas coactivas/)).toBeDisabled()
        expect(within(dialog).getByText(/Prescripta el 10\/09\/2026/)).toBeInTheDocument()
        // La que no está declarada se sigue pudiendo quitar y corregir.
        expect(within(dialog).getByRole('button', { name: /^Quitar Encubrimiento/ })).toBeEnabled()
        expect(within(dialog).getByLabelText(/^Fecha del hecho de Encubrimiento/)).toBeEnabled()
    })
})

