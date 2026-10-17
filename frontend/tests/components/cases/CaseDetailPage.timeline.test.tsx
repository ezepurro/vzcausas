import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { personNameIn } from '../../setup/names'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * La línea de vida de la causa (HU-27): el panel "Ciclo de vida de la causa"
 * del detalle, que sale de `GET /cases/{caseId}/timeline` (V4 D-85). Los
 * textos de cada entrada son los del prototipo.
 *
 * Cada movimiento es un elemento de lista (`listitem`) dentro del panel.
 *
 * Con el reloj en el 15/09/2026:
 *
 * | Causa | Para qué está acá |
 * | --- | --- |
 * | 1 | Penal: dos actos procesales recientes, un acto interruptivo del 04/07/2024 y el primer acto de 2021 |
 * | 2 | Administrativa: actos con fecha de notificación (RN6) y el plazo vigente vencido |
 * | 8 | Estado escrito a mano, con el vencimiento ajustado a mano |
 * | 10 | Marcada como prescripta |
 * | 22 | Amparo en "Iniciada": sin movimientos |
 */

function renderPage(caseId: number, as = 'gestion') {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
        routes: [{ path: '/causas/:caseId/acto', element: <p>Pantalla de registrar acto</p> }],
    })
}

const TITLE = 'Ciclo de vida de la causa'

/** El panel de la línea de vida, una vez que llegaron sus movimientos. */
async function timeline() {
    const title = await screen.findByText(TITLE, { selector: '.vz-panel__title' })
    return title.closest('.vz-panel') as HTMLElement
}

async function entries() {
    const panel = await timeline()
    return within(panel).findAllByRole('listitem')
}

describe('CaseDetailPage · línea de vida', () => {
    usePrototypeToday()

    // CA-27.1, CA-27.2, CA-27.11: todos juntos, del más reciente al más antiguo.
    it('intercala actos procesales y actos interruptivos, del más reciente al más antiguo', async () => {
        renderPage(1)

        const items = await entries()
        expect(items).toHaveLength(4)
        expect(items[0]).toHaveTextContent('Oposición al requerimiento de elevación')
        expect(items[0]).toHaveTextContent('09/09/2026')
        expect(items[1]).toHaveTextContent('Requerimiento de elevación a juicio')
        expect(items[2]).toHaveTextContent('Indagatoria')
        expect(items[2]).toHaveTextContent('Acto interruptivo')
        expect(items[2]).toHaveTextContent('04/07/2024')
        expect(items[3]).toHaveTextContent('Designación de abogado defensor')
    })

    // CA-27.3: los datos de cada acto procesal.
    it('cada acto muestra su fecha, el estado, las observaciones, el plazo y quién lo registró', async () => {
        renderPage(1)

        const [current] = await entries()
        expect(current).toHaveTextContent('Abre el plazo de 5 días hábiles para oponerse.')
        expect(current).toHaveTextContent('16/09/2026')
        expect(current).toHaveTextContent(new RegExp(personNameIn('Ríos', 'Malena')))
    })

    // CA-27.4: sólo el plazo del acto vigente está abierto.
    it('sólo el plazo del acto vigente se muestra abierto', async () => {
        renderPage(2)

        const items = await entries()
        // Los dos últimos actos vencieron el 11/09; abierto, y vencido, sólo el vigente.
        expect(items[0]).toHaveTextContent('Plazo vencido el 11/09/2026')
        expect(items[1]).not.toHaveTextContent(/Plazo vencido el|Plazo abierto|Vence hoy/)
        const panel = await timeline()
        expect(within(panel).getAllByText(/Plazo vencido el|Plazo abierto · vence|Vence hoy ·/)).toHaveLength(1)
    })

    // CA-27.5: en el administrativo, la fecha de notificación (RN6).
    it('en el fuero administrativo cada acto muestra su fecha de notificación', async () => {
        renderPage(2)

        const items = await entries()
        expect(items[0]).toHaveTextContent('03/09/2026')
    })

    // CA-27.6, CA-27.8: estado escrito a mano y vencimiento ajustado.
    it('identifica el estado escrito a mano y el vencimiento ajustado a mano', async () => {
        renderPage(8)

        const [current] = await entries()
        expect(current).toHaveTextContent('Con acusación, pero con oposición')
        expect(current).toHaveTextContent(/escrito a mano/i)
        expect(current).toHaveTextContent('21/09/2026')
        expect(current).toHaveTextContent(/ajustad[oa] a mano/i)
    })

    // CA-27.11: identifica el acto interruptivo que rige; uno anterior aparece igual.
    it('marca cuál acto interruptivo rige la prescripción, y muestra también los anteriores', async () => {
        db.interruptiveActs.push({
            id: 900,
            caseId: 1,
            name: 'Citación a indagatoria',
            actDate: '2023-03-10',
            notes: null,
            registeredById: 3,
            registeredAt: '2026-09-14T10:00:00-03:00',
        })
        renderPage(1)

        const items = await entries()
        expect(items).toHaveLength(5)
        expect(items[2]).toHaveTextContent('Indagatoria')
        expect(items[2]).toHaveTextContent(/rige/i)
        expect(items[3]).toHaveTextContent('Citación a indagatoria')
        expect(items[3]).not.toHaveTextContent(/rige/i)
    })

    // CA-27.12: el pase a "Prescripta".
    it('muestra el pase a prescripta con su fecha, la resolución, el fundamento y quién lo registró', async () => {
        renderPage(10)

        const [declaration] = await entries()
        expect(declaration).toHaveTextContent('Prescripta')
        expect(declaration).toHaveTextContent('05/03/2020')
        expect(declaration).toHaveTextContent('Auto N° 57 de la Fiscalía de Instrucción Distrito 3 Turno 1')
        expect(declaration).toHaveTextContent('Transcurrió el plazo del art. 62 inc. 2 CP sin actos interruptivos.')
        expect(declaration).toHaveTextContent(new RegExp(personNameIn('Zárate', 'Oscar')))
    })

    // CA-27.14: sin movimientos no es un error.
    it('una causa sin actos muestra la línea de vida vacía', async () => {
        renderPage(22)

        const panel = await timeline()
        expect(await within(panel).findByText('Todavía no hay actos procesales')).toBeInTheDocument()
        expect(within(panel).queryAllByRole('listitem')).toHaveLength(0)
    })

    // TESTING.md §7: el estado de error de la consulta.
    it('si la línea de vida no carga, lo informa en el panel', async () => {
        server.use(
            http.get('*/cases/:caseId/timeline', () =>
                HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), { status: 500 }),
            ),
        )
        renderPage(1)

        const panel = await timeline()
        expect(await within(panel).findByText('Error del servidor de prueba.')).toBeInTheDocument()
    })
})
