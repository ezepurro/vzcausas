import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { errorBody, resetMockDb } from '@/shared/mocks'
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
            expect(header).toHaveTextContent('Responsable Dra. Malena Ríos')
        })
    })

    describe('datos del cliente (CA-22.2)', () => {
        it('muestra la tarjeta del cliente con su contacto y desde cuándo es cliente', async () => {
            renderPage(1)
            await headerOf('Causa 13284571')

            expect(panelTitle('Cliente')).toBeInTheDocument()
            expect(screen.getByText('GÓMEZ, Ariel Fernando')).toBeInTheDocument()
            expect(screen.getByText('34.812.905')).toBeInTheDocument()
            expect(screen.getByText('351 415-2288')).toBeInTheDocument()
            expect(screen.getByText('afgomez@gmail.com')).toBeInTheDocument()
            expect(screen.getByText('12/03/2021')).toBeInTheDocument()
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
                screen.getByText('Solo el abogado responsable (Dra. Malena Ríos) registra actos.'),
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
