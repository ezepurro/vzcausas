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
 * Anular un acto procesal (HU-29, V6 §3.8), desde "Anular" en cada acto de la
 * línea de vida. Es el diálogo "Anular acto procesal" del prototipo, con
 * "Motivo de la anulación (opcional)" y "Anular acto".
 *
 * El prototipo dice que el acto "queda asentado como anulado en el ciclo de
 * vida"; manda D-124: el acto **desaparece** y el estado de la causa se
 * recalcula. Por eso la nota y el aviso están adaptados (`cases/CAMBIOS.md`).
 *
 * Con el reloj en el 15/09/2026:
 *
 * | Causa | Para qué está acá |
 * | --- | --- |
 * | 2 | De `iperalta`. Administrativa: anular "Alegato" deja abierto el plazo vencido del descargo |
 * | 1 | De `mrios`. Tres actos procesales y un acto interruptivo; el vigente, "Oposición al requerimiento de elevación" del 09/09/2026 |
 * | 9 | De `mrios`. Penal en "Archivada": anular ese acto la reabre |
 * | 10 | Marcada como prescripta: sus actos no se anulan |
 * | 17 | De `mrios`. Dos actos: sin uno de ellos queda un solo acto |
 *
 * @backend CA-29.6 CA-29.9 CA-29.11 CA-29.12
 * (los actos interruptivos y la prescripción no cambian, el `400` de un id que
 * no es entero, el reflejo en tableros, proceso diario y reporte, y la
 * auditoría los resuelve el backend; que el listado de causas y los contadores
 * se vuelvan a pedir lo hace `refreshCaseAfterAct`, como al registrar un acto)
 */

function renderPage(caseId: number, as = 'mrios') {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
    })
}

type User = ReturnType<typeof renderPage>['user']

const OPOSICION = 'Oposición al requerimiento de elevación'
const REQUERIMIENTO = 'Requerimiento de elevación a juicio'
const DONE = 'Acto anulado. El estado de la causa se recalculó.'

async function timeline() {
    const title = await screen.findByText('Ciclo de vida de la causa', { selector: '.vz-panel__title' })
    return title.closest('.vz-panel') as HTMLElement
}

async function entries() {
    return within(await timeline()).findAllByRole('listitem')
}

/** El recuadro "Estado procesal actual" del encabezado. */
function currentState(sac: string) {
    const header = screen.getByRole('region', { name: `Causa ${sac}` })
    return within(header).getByText('Estado procesal actual').parentElement as HTMLElement
}

/** Abre "Anular" del acto más reciente. */
async function openAnnul(user: User) {
    const [latest] = await entries()
    await user.click(within(latest).getByRole('button', { name: 'Anular' }))
    return screen.getByRole('dialog', { name: /Anular acto procesal/ })
}

async function confirm(user: User, dialog: HTMLElement) {
    await user.click(within(dialog).getByRole('button', { name: 'Anular acto' }))
}

const actOf = (caseId: number, stateId: number) =>
    db.proceduralActs.find((a) => a.caseId === caseId && a.proceduralStateId === stateId)

describe('CaseDetailPage · anular acto procesal (HU-29)', () => {
    usePrototypeToday()

    /* Prototipo: "Anular" va junto a "Modificar" en cada acto procesal. Un acto
       interruptivo no es un acto procesal: no se anula por acá. */
    it('cada acto procesal ofrece "Anular"; los actos interruptivos, no', async () => {
        renderPage(1)

        const items = await entries()
        expect(within(await timeline()).getAllByRole('button', { name: 'Anular' })).toHaveLength(3)
        const interruptive = items.find((item) => item.textContent?.includes('Indagatoria')) as HTMLElement
        expect(within(interruptive).queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument()
    })

    /* CA-29.7 (D-30): ni otro abogado ni el Administrador anulan actos ajenos.
       Va deshabilitado con la nota de la línea de vida, como "Modificar". */
    it('a quien no es el responsable se lo muestra deshabilitado, con su nota', async () => {
        renderPage(1, 'fvazquez')
        const reason = new RegExp(
            `^Solo el abogado responsable \\(${personNameIn('Ríos', 'Malena')}\\) modifica y anula los actos procesales\\.$`,
        )

        const [latest] = await entries()
        const annul = within(latest).getByRole('button', { name: 'Anular' })
        expect(annul).toBeDisabled()
        expect(annul).toHaveAccessibleDescription(reason)
    })

    /* CA-29.8 (D-99): "Prescripta" no la puso un acto, así que sus actos no se
       anulan. Como "Modificar", no se ofrece. */
    it('en una causa marcada como prescripta no se ofrece', async () => {
        renderPage(10, 'gestion')

        await entries()
        expect(within(await timeline()).queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument()
    })

    /* Prototipo y CA-29.10: el motivo es opcional y de hasta 500 caracteres. */
    it('abre "Anular acto procesal" con el acto, la nota y el motivo opcional', async () => {
        const { user } = renderPage(1)
        const dialog = await openAnnul(user)

        expect(within(dialog).getByText(`${OPOSICION} · 09/09/2026`)).toBeInTheDocument()
        expect(
            within(dialog).getByText(
                'La baja es lógica: el acto deja de mostrarse en el ciclo de vida y el estado de la causa se recalcula con el acto anterior.',
            ),
        ).toBeInTheDocument()
        const reason = within(dialog).getByLabelText(/^Motivo de la anulación \(opcional\)/)
        expect(reason).toHaveValue('')
        expect(reason).toHaveAttribute('maxlength', '500')
    })

    /* CA-29.1, CA-29.2 y CA-29.3: el acto sale de la línea de vida y la causa
       vuelve al estado del acto vigente más reciente. El motivo queda guardado. */
    it('anula el acto con motivo: sale de la línea de vida y la causa vuelve al estado anterior', async () => {
        const { user } = renderPage(1)
        await screen.findByRole('region', { name: 'Causa 13284571' })
        expect(currentState('13284571')).toHaveTextContent(OPOSICION)
        const dialog = await openAnnul(user)

        await user.type(within(dialog).getByLabelText(/^Motivo de la anulación/), 'Acto cargado dos veces.')
        await confirm(user, dialog)

        expect(await screen.findByText(DONE)).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        const items = await entries()
        expect(items).toHaveLength(3)
        expect(items[0]).toHaveTextContent(REQUERIMIENTO)
        expect(screen.queryByText(OPOSICION, { selector: '.vz-timeline__title' })).not.toBeInTheDocument()
        expect(currentState('13284571')).toHaveTextContent(REQUERIMIENTO)
        expect(actOf(1, 4)).toMatchObject({ active: false, annulment: { reason: 'Acto cargado dos veces.' } })
    })

    /* CA-29.1: sin motivo también; no viaja cuerpo. */
    it('anula el acto sin motivo', async () => {
        const { user } = renderPage(1)
        const dialog = await openAnnul(user)

        await confirm(user, dialog)

        expect(await screen.findByText(DONE)).toBeInTheDocument()
        expect(actOf(1, 4)).toMatchObject({ active: false, annulment: { reason: null } })
    })

    /* CA-29.4: el plazo abierto pasa a ser el del nuevo acto más reciente,
       aunque ya esté vencido: un plazo vencido sigue abierto. En la causa 2,
       el descargo del 28/08/2026 tenía 10 días hábiles desde la notificación. */
    it('el plazo abierto pasa al acto anterior, aunque esté vencido', async () => {
        const { user } = renderPage(2, 'iperalta')
        await screen.findByRole('region', { name: 'Causa 12907344' })
        expect(currentState('12907344')).toHaveTextContent('Alegato')
        const dialog = await openAnnul(user)

        await confirm(user, dialog)

        expect(await screen.findByText(DONE)).toBeInTheDocument()
        expect(currentState('12907344')).toHaveTextContent('Presentación de descargo')
        expect(screen.getByRole('region', { name: 'Causa 12907344' })).toHaveTextContent(/Vencido hace \d+ días?/)
        // En la línea de vida, abierto y vencido; no "Plazo cerrado · vencía…".
        const [current] = await entries()
        expect(current).toHaveTextContent('Presentación de descargo')
        expect(current).toHaveTextContent('Plazo vencido el 11/09/2026')
        expect(current).not.toHaveTextContent('Plazo cerrado')
    })

    /* CA-29.3: sin actos vigentes, la causa vuelve a "Iniciada" y la línea de
       vida queda vacía. */
    it('anular el único acto que queda devuelve la causa a "Iniciada"', async () => {
        const first = actOf(17, 1)
        if (first) first.active = false
        const { user } = renderPage(17)
        const dialog = await openAnnul(user)

        await confirm(user, dialog)

        expect(await screen.findByText(DONE)).toBeInTheDocument()
        expect(await within(await timeline()).findByText('Todavía no hay actos procesales')).toBeInTheDocument()
        expect(currentState('12104893')).toHaveTextContent('Iniciada')
    })

    /* CA-29.5 (D-99): anular el acto que archivó la causa la reabre. */
    it('anular el acto que archivó la causa la reabre en el estado anterior', async () => {
        const { user } = renderPage(9)
        expect(await screen.findByRole('region', { name: 'Causa 10556781' })).toHaveTextContent('Archivada')
        const dialog = await openAnnul(user)

        await confirm(user, dialog)

        expect(await screen.findByText(DONE)).toBeInTheDocument()
        await waitFor(() => expect(currentState('10556781')).toHaveTextContent('Designación de abogado defensor'))
        expect(currentState('10556781')).not.toHaveTextContent('Archivada')
    })

    /* CA-29.10: el 400 del motivo se marca en su campo y el diálogo queda abierto. */
    it('un 400 del motivo se marca en el campo y deja el diálogo abierto', async () => {
        server.use(
            http.delete('*/cases/:caseId/procedural-acts/:actId', () =>
                HttpResponse.json(
                    errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                        reason: 'Debe tener hasta 500 caracteres.',
                    }),
                    { status: 400 },
                ),
            ),
        )
        const { user } = renderPage(1)
        const dialog = await openAnnul(user)

        await user.type(within(dialog).getByLabelText(/^Motivo de la anulación/), 'Duplicado.')
        await confirm(user, dialog)

        expect(await within(dialog).findByText('Debe tener hasta 500 caracteres.')).toBeInTheDocument()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    /* CA-29.7 y CA-29.8: el 403 (cambió el responsable con la pantalla
       abierta) y el 422 (la marcaron prescripta) se avisan con el texto del
       backend, y el acto sigue en la línea de vida. */
    it.each([
        [403, 'FORBIDDEN', 'Solo el abogado responsable de la causa puede anular sus actos procesales.'],
        [422, 'CASE_IN_TERMINAL_STATE', 'La causa está prescripta: sus actos procesales no se pueden anular.'],
    ] as const)('un %i del servidor avisa con su mensaje y el acto sigue', async (status, code, message) => {
        server.use(
            http.delete('*/cases/:caseId/procedural-acts/:actId', () =>
                HttpResponse.json(errorBody(code, message), { status }),
            ),
        )
        const { user } = renderPage(1)
        const dialog = await openAnnul(user)

        await confirm(user, dialog)

        expect(await screen.findByRole('alert')).toHaveTextContent(message)
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        expect((await entries())[0]).toHaveTextContent(OPOSICION)
    })

    /* CA-29.9: otro lo anuló antes. Se avisa con el texto del backend y la
       línea de vida se vuelve a pedir, ya sin el acto. */
    it('si el acto ya no existe, avisa y la línea de vida se vuelve a pedir sin él', async () => {
        const { user } = renderPage(1)
        const dialog = await openAnnul(user)

        const act = actOf(1, 4)
        if (act) act.active = false
        await confirm(user, dialog)

        expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el acto procesal solicitado.')
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        await waitFor(async () => expect((await entries())[0]).toHaveTextContent(REQUERIMIENTO))
    })
})
