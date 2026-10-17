import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { personNameIn } from '../../setup/names'
import { server } from '@/shared/mocks/server'
import { errorBody } from '@/shared/mocks'
import { HomePage } from '@/features/home/pages/HomePage'

/**
 * El tablero del abogado, "Mi día" (HU-41), en `/inicio`. Sale de
 * `GET /dashboards/lawyer` (V4 §3.11); los textos son los del inicio del
 * prototipo.
 *
 * Con el reloj en el martes 15/09/2026:
 *
 * | Usuario | Qué tiene |
 * | --- | --- |
 * | `mrios` | 2 causas activas: la 17 venció el 04/09 (hace 7 días hábiles) y la 1 vence el 16/09. Ninguna para impulsar ni en alerta |
 * | `fvazquez` | Administrador y abogado. 3 causas: la 6 y la 20 vencen hoy; la 4 está para impulsar (71 días sin actos) y en alerta de prescripción (78 %) |
 */

function renderPage(as: string) {
    return renderWithProviders(<HomePage />, {
        as,
        path: '/inicio',
        route: '/inicio',
        routes: [{ path: '/causas/:caseId', element: <p>Detalle de la causa</p> }],
    })
}

/** Un indicador: el rótulo y su número, en el mismo recuadro. */
function tile(label: string): HTMLElement {
    let el: HTMLElement | null = screen.getByText(label, { exact: true })
    while (el && !/\d/.test((el.textContent ?? '').replace(label, ''))) el = el.parentElement
    if (!el) throw new Error(`No se encontró el indicador "${label}".`)
    return el
}

const tileNumber = (label: string) => (tile(label).textContent ?? '').replace(label, '').match(/\d+/)?.[0]

describe('HomePage · Mi día', () => {
    usePrototypeToday()

    // CA-41.1: el tablero propio, con el saludo y la fecha del día.
    it('saluda al abogado y muestra el día', async () => {
        renderPage('mrios')

        expect(
            await screen.findByRole('heading', { name: new RegExp(`^Buen día, ${personNameIn('Ríos', 'Malena')}$`) }),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Martes 15 de septiembre de 2026 · tus causas pendientes y los plazos por vencer'),
        ).toBeInTheDocument()
    })

    // CA-41.2
    it('muestra los cuatro indicadores de sus causas', async () => {
        renderPage('mrios')
        await screen.findByText('Lo primero de hoy')

        expect(tileNumber('Vencen hoy')).toBe('0')
        expect(tileNumber('Vencidos')).toBe('1')
        expect(tileNumber('Próx. 5 días hábiles')).toBe('1')
        expect(tileNumber('Mis causas activas')).toBe('2')
    })

    // CA-41.12: "Lo primero de hoy" es el plazo más urgente, y lleva a la causa.
    it('"Lo primero de hoy" es el plazo más urgente', async () => {
        const { user } = renderPage('mrios')

        const first = (await screen.findByText('Lo primero de hoy')).closest('section, .vz-panel') as HTMLElement
        expect(first).toHaveTextContent('GÓMEZ, Ariel Fernando p.s.a. Amenazas coactivas')
        expect(first).toHaveTextContent('Venció hace 7 días')
        expect(first).toHaveTextContent('04/09/2026')

        await user.click(within(first).getByRole('button', { name: /ver (detalle|causa)/i }))
        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
    })

    // CA-41.3, CA-41.12: los plazos agrupados por urgencia, y el calendario del mes.
    it('agrupa los plazos en Vencidos, Hoy, Esta semana y Después, y los pone en el calendario', async () => {
        renderPage('mrios')
        await screen.findByText('Lo primero de hoy')

        for (const group of ['Vencidos', 'Hoy', 'Esta semana', 'Después']) {
            expect(screen.getAllByText(group).length).toBeGreaterThan(0)
        }
        expect(screen.getByText('Septiembre 2026')).toBeInTheDocument()
        expect(screen.getAllByText(/GÓMEZ, Ariel Fernando p\.s\.a\. Robo calificado|^GÓMEZ, Ariel Fernando$/).length).toBeGreaterThan(0)
    })

    // CA-41.4: las causas sin plazo corriendo, con la última actuación.
    it('lista las causas para impulsar, con cuánto llevan sin movimiento', async () => {
        const { user } = renderPage('fvazquez')

        const panel = (await screen.findByText('Causas para impulsar')).closest('section, .vz-panel') as HTMLElement
        expect(panel).toHaveTextContent('ACOSTA, Jonathan E. p.s.a. Infracción Ley 23.737')
        expect(panel).toHaveTextContent('71 días')
        expect(panel).toHaveTextContent('06/07/2026')

        await user.click(within(panel).getByRole('button', { name: /ver (detalle|causa)/i }))
        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
    })

    // CA-41.5, CA-32.9: sus causas en alerta de prescripción.
    it('muestra sus causas en alerta de prescripción', async () => {
        renderPage('fvazquez')

        const panel = (await screen.findByText('Alertas de prescripción')).closest('section, .vz-panel') as HTMLElement
        expect(panel).toHaveTextContent('ACOSTA, Jonathan E.')
        expect(panel).toHaveTextContent('78 % transcurrido')
    })

    // CA-41.8, CA-32.12: sin nada que mostrar no es un error.
    it('sin causas para impulsar ni alertas, lo dice', async () => {
        renderPage('mrios')

        expect(await screen.findByText('Todas tus causas tienen un plazo en curso.')).toBeInTheDocument()
        expect(screen.getByText('Ninguna causa superó el 70 % de su plazo de prescripción.')).toBeInTheDocument()
    })

    // CA-41.8
    it('sin plazos abiertos, lo dice', async () => {
        server.use(
            http.get('*/dashboards/lawyer', () =>
                HttpResponse.json({
                    data: {
                        date: '2026-09-15',
                        lawyer: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
                        summary: { dueToday: 0, overdue: 0, dueSoon: 0, activeCases: 0 },
                        deadlines: [],
                        prescriptionAlerts: [],
                        casesToAdvance: [],
                    },
                }),
            ),
        )
        renderPage('mrios')

        expect(await screen.findByText('Sin plazos abiertos')).toBeInTheDocument()
    })

    // CA-41.7: abogado y administrador a la vez ve los dos tableros.
    it('quien además es administrador ve "Mi día" y "Estudio", y arranca en "Mi día"', async () => {
        renderPage('fvazquez')

        const mine = await screen.findByRole('tab', { name: 'Mi día' })
        expect(mine).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByRole('tab', { name: 'Estudio' })).toHaveAttribute('aria-selected', 'false')
    })

    // TESTING.md §7
    it('si el tablero no carga, muestra el error', async () => {
        server.use(
            http.get('*/dashboards/lawyer', () =>
                HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), { status: 500 }),
            ),
        )
        renderPage('mrios')

        expect(await screen.findByText('Error del servidor de prueba.')).toBeInTheDocument()
    })
})
