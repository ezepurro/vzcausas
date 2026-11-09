import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { personNameIn } from '../../setup/names'
import { server } from '@/shared/mocks/server'
import { db, errorBody, resetMockDb } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * Detalle de causa (HU-22), en `/causas/:caseId`. Cada test dice qué criterio de
 * aceptación cubre.
 *
 * Las causas son las del mock, con el reloj fijo en el día del prototipo
 * —martes 15/09/2026—, porque los vencimientos de las semillas se ubican
 * respecto de hoy:
 *
 * | Causa | Para qué está acá |
 * | --- | --- |
 * | 1 | Penal con estado y plazo abierto a un día hábil. La lleva `mrios` |
 * | 7 | Penal en "Iniciada", con dos calificaciones de fechas distintas. La lleva `mferreyra` |
 * | 22 | Amparo en "Iniciada": fuera del penal no hay prescripción |
 * | 23 | Penal sin SAC y sin calificaciones |
 */

function renderPage(caseId: number | string, as = 'mrios') {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
        routes: [
            { path: '/causas', element: <p>Listado de causas</p> },
            { path: '/causas/:caseId/acto', element: <p>Pantalla de registrar acto</p> },
        ],
    })
}

/** El encabezado de la causa, una vez cargada. */
const headerOf = (name: string) => screen.findByRole('region', { name })

/**
 * El título de un `Panel`. No es un heading: `Panel` lo dibuja como un `div`
 * con esa clase (ver la nota al pie de este archivo).
 */
const panelTitle = (title: string) => screen.getByText(title, { selector: '.vz-panel__title' })

describe('CaseDetailPage', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
        resetMockDb()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    describe('encabezado de la causa (CA-22.1)', () => {
        it('muestra la carátula, el SAC, el fuero, el tribunal y el responsable', async () => {
            renderPage(1)
            const header = await headerOf('Causa 13284571')

            expect(within(header).getByRole('heading', { level: 1 })).toHaveTextContent(
                'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
            )
            expect(header).toHaveTextContent('SAC 13284571')
            expect(header).toHaveTextContent('Juzgado de Control N° 3 · Córdoba')
            expect(header).toHaveTextContent('Fuero Penal')
            // El tratamiento lo pone el frontend (V4 D-81): ver `personName`.
            expect(header).toHaveTextContent(new RegExp(`Responsable ${personNameIn('Ríos', 'Malena')}`))
        })
    })

    describe('datos del cliente (CA-22.2)', () => {
        it('muestra la tarjeta del cliente con su contacto y desde cuándo es cliente', async () => {
            renderPage(1)
            await headerOf('Causa 13284571')

            expect(panelTitle('Cliente')).toBeInTheDocument()
            /* Dentro de la tarjeta: el 12/03/2021 es también la fecha del primer
               acto de la línea de vida, que llega junto con la causa. */
            const card = within(panelTitle('Cliente').closest('.vz-panel') as HTMLElement)
            expect(card.getByText('GÓMEZ, Ariel Fernando')).toBeInTheDocument()
            expect(card.getByText('34.812.905')).toBeInTheDocument()
            expect(card.getByText('351 415-2288')).toBeInTheDocument()
            expect(card.getByText('afgomez@gmail.com')).toBeInTheDocument()
            expect(card.getByText('12/03/2021')).toBeInTheDocument()
        })
    })

    describe('prescripción (CA-22.3)', () => {
        /* La causa 7 tiene dos calificaciones con hechos de fechas distintas:
           Lesiones graves (6 años desde el 30/08/2026) y Amenazas coactivas
           (2 años desde el 02/09/2026). Prescribe primero la segunda. */
        it('muestra el avance y lo que resta de la que prescribe primero, y la identifica', async () => {
            renderPage(7, 'mferreyra')
            await headerOf('Causa 14118903')

            // La carátula de la causa nombra las dos calificaciones, así que la
            // de la barra se busca por su renglón propio.
            expect(screen.getByText(/^· Amenazas coactivas/)).toBeInTheDocument()
            expect(screen.getByText(/^Restan /)).toBeInTheDocument()
            expect(
                screen.getByText(/Calificación que prescribe primero: Amenazas coactivas/),
            ).toBeInTheDocument()
            // Las dos fechas de esa calificación, no las de la otra.
            expect(screen.getByText('02/09/2026')).toBeInTheDocument()
            expect(screen.getByText('02/09/2028')).toBeInTheDocument()
        })

        /* D-112. La causa 13 tiene Amenazas coactivas (2 años desde el
           02/07/2024: prescribió el 02/07/2026) y Encubrimiento (6 años desde el
           acto interruptivo del 20/06/2024: vence el 20/06/2030, 37 %). Rige
           Amenazas, pero ya prescribió: la barra muestra Encubrimiento. */
        it('si el delito que prescribe primero ya prescribió, la barra muestra el próximo', async () => {
            renderPage(13)
            await headerOf('Causa 12660318')

            expect(screen.getByText(/^· Encubrimiento/)).toBeInTheDocument()
            expect(screen.queryByText(/^· Amenazas coactivas/)).not.toBeInTheDocument()
            expect(screen.getByRole('meter', { name: 'Prescripción transcurrida' })).toHaveAttribute('aria-valuetext', '37 %')
            expect(screen.getByText('20/06/2030')).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Cómputo reiniciado por el acto interruptivo registrado el 20/06/2024. Ya prescribió 1 delito. Próximo a prescribir: Encubrimiento — art. 277 CP.',
                ),
            ).toBeInTheDocument()
        })

        it('si prescribieron todos los delitos, no hay barra y lo dice', async () => {
            const stored = db.cases.find((c) => c.id === 13)!
            stored.qualifications = stored.qualifications.filter((q) => q.legalQualificationId === 4)
            renderPage(13)
            await headerOf('Causa 12660318')

            expect(screen.getByText('Todos los delitos prescribieron.')).toBeInTheDocument()
            expect(screen.queryByText('Prescripción de la acción', { exact: false })).not.toBeInTheDocument()
        })

        // D-112: el encabezado lista todos los delitos de la causa, con su estado.
        it('lista los delitos de la causa en el encabezado: los que prescribieron, el próximo y los vigentes', async () => {
            renderPage(13)
            const header = await headerOf('Causa 12660318')

            const list = within(header).getByRole('list', { name: 'Calificaciones legales' })
            const rows = within(list).getAllByRole('listitem')
            // Por vencimiento: primero la que ya prescribió.
            expect(rows).toHaveLength(2)
            expect(rows[0]).toHaveTextContent('Amenazas coactivas — art. 149 bis CP')
            expect(rows[0]).toHaveTextContent('Prescribió el 02/07/2026')
            expect(rows[1]).toHaveTextContent('Encubrimiento — art. 277 CP')
            expect(rows[1]).toHaveTextContent('Próximo a prescribir')
            expect(rows[1]).toHaveTextContent('6 años · vence el 20/06/2030')
        })

        it('marca como vigentes los que no son el próximo', async () => {
            renderPage(7, 'mferreyra')
            await headerOf('Causa 14118903')

            const rows = within(screen.getByRole('list', { name: 'Calificaciones legales' })).getAllByRole('listitem')
            expect(rows[0]).toHaveTextContent(/Amenazas coactivas.*Próximo a prescribir/)
            expect(rows[1]).toHaveTextContent(/Lesiones graves.*Vigente/)
        })

        it('fuera del penal, o sin calificaciones, no hay lista de calificaciones', async () => {
            const amparo = renderPage(22)
            await screen.findByText('Ciclo de vida de la causa', { selector: '.vz-panel__title' })
            expect(screen.queryByRole('list', { name: 'Calificaciones legales' })).not.toBeInTheDocument()
            amparo.unmount()

            renderPage(23, 'mferreyra')
            await headerOf('Causa sin SAC')
            expect(screen.queryByRole('list', { name: 'Calificaciones legales' })).not.toBeInTheDocument()
        })
    })

    describe('causa recién registrada (CA-22.4)', () => {
        /* CA-18.7: nace en "Iniciada", sin vencimiento. */
        it('muestra el estado inicial "Iniciada" y sin vencimiento', async () => {
            renderPage(7, 'mferreyra')
            const header = await headerOf('Causa 14118903')

            expect(header).toHaveTextContent('Iniciada')
            expect(within(header).getByText('Sin plazo abierto')).toBeInTheDocument()
        })
    })

    describe('quién registra los actos (V3 D-30)', () => {
        it.each([
            ['otro abogado', 'mferreyra'],
        ])('%s lo ve deshabilitado, con la nota de quién es el responsable', async (_, username) => {
            renderPage(1, username)
            await headerOf('Causa 13284571')

            expect(screen.getByRole('button', { name: 'Registrar acto procesal' })).toBeDisabled()
            expect(
                screen.getByText(new RegExp(`^Solo el abogado responsable \\(${personNameIn('Ríos', 'Malena')}\\) registra actos\\.$`)),
            ).toBeInTheDocument()
        })
    })

    describe('causa inexistente (CA-22.6)', () => {
        it('informa que la causa no fue encontrada', async () => {
            renderPage(9999)

            expect(await screen.findByText('No se pudo cargar la causa')).toBeInTheDocument()
            expect(screen.getByText('No se encontró la causa solicitada.')).toBeInTheDocument()
        })
    })

    describe('estados de la consulta', () => {
        it('si el servidor rechaza la consulta, muestra el error', async () => {
            server.use(
                http.get('*/cases/:caseId', () =>
                    HttpResponse.json(errorBody('FORBIDDEN', 'Rechazo de prueba.'), { status: 403 }),
                ),
            )
            renderPage(1)

            expect(await screen.findByText('No se pudo cargar la causa')).toBeInTheDocument()
            expect(screen.getByText('Rechazo de prueba.')).toBeInTheDocument()
        })
    })
})
