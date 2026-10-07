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

        it('muestra el estado procesal actual y el vencimiento vigente', async () => {
            renderPage(1)
            const header = await headerOf('Causa 13284571')

            expect(header).toHaveTextContent('Estado procesal actual')
            expect(header).toHaveTextContent('Oposición al requerimiento de elevación')
            expect(within(header).getByText('En 1 día hábil')).toBeInTheDocument()
        })

        it('muestra el instructor con su teléfono y su interno', async () => {
            renderPage(1)
            const header = await headerOf('Causa 13284571')

            expect(header).toHaveTextContent('Instructor Dra. Verónica Ledesma')
            expect(header).toHaveTextContent('Teléfono 0351 448-1200')
            expect(header).toHaveTextContent('Interno 214')
        })

        /* CA-18.2: el SAC es opcional, y el detalle tiene que poder no tenerlo. */
        it('una causa sin SAC se muestra como "Sin SAC"', async () => {
            renderPage(23)

            expect(await headerOf('Causa sin SAC')).toHaveTextContent('Sin SAC')
        })

        it('las migas llevan al listado y muestran el SAC de la causa', async () => {
            const { user } = renderPage(1)
            await headerOf('Causa 13284571')

            await user.click(screen.getByRole('button', { name: 'Causas' }))

            expect(await screen.findByText('Listado de causas')).toBeInTheDocument()
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

        it('muestra el rol procesal del cliente en esta causa', async () => {
            renderPage(1)

            expect(await headerOf('Causa 13284571')).toHaveTextContent('Rol Defensa')
        })

        it('en un amparo el rol es el de ese fuero', async () => {
            renderPage(22, 'gestion')

            expect(await headerOf('Causa 13619027')).toHaveTextContent('Rol Actora')
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

        /* CA-18.6: el cómputo corre desde la fecha del hecho, no desde el inicio. */
        it('aclara que el cómputo corre desde la fecha del hecho', async () => {
            renderPage(7, 'mferreyra')
            await headerOf('Causa 14118903')

            expect(screen.getByText(/El cómputo corre desde la fecha del hecho/)).toBeInTheDocument()
        })

        /* CA-18.4: fuera del penal no se computa prescripción. */
        it('en un amparo no dibuja la barra de prescripción', async () => {
            renderPage(22, 'gestion')
            await headerOf('Causa 13619027')

            expect(screen.queryByText(/prescribe primero/)).not.toBeInTheDocument()
            expect(screen.queryByText(/^Restan /)).not.toBeInTheDocument()
        })

        /* CA-18.5: una causa penal sin calificaciones no computa prescripción. */
        it('una causa penal sin calificaciones tampoco la dibuja', async () => {
            renderPage(23, 'mferreyra')
            await headerOf('Causa sin SAC')

            expect(screen.queryByText(/^Restan /)).not.toBeInTheDocument()
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

        it('ofrece registrar el primer acto procesal', async () => {
            const { user } = renderPage(7, 'mferreyra')
            await headerOf('Causa 14118903')

            await user.click(screen.getByRole('button', { name: 'Registrar acto procesal' }))

            expect(await screen.findByText('Pantalla de registrar acto')).toBeInTheDocument()
        })

        /* Fuera de alcance: el ciclo de vida de la causa es HU-27, Sprint 3
           (V3 §8.3). No hay endpoint para listar los actos. */
        it('no dibuja el panel "Ciclo de vida" ni su aviso', async () => {
            renderPage(7, 'mferreyra')
            await headerOf('Causa 14118903')

            expect(screen.queryByText(/Ciclo de vida/)).not.toBeInTheDocument()
            expect(screen.queryByText('Todavía no hay actos procesales')).not.toBeInTheDocument()
        })
    })

    describe('quién registra los actos (V3 D-30)', () => {
        it('el abogado responsable de la causa lo tiene habilitado', async () => {
            renderPage(1, 'mrios')
            await headerOf('Causa 13284571')

            expect(screen.getByRole('button', { name: 'Registrar acto procesal' })).toBeEnabled()
        })

        it.each([
            ['otro abogado', 'mferreyra'],
            ['el administrador', 'fvazquez'],
            ['la Secretaría', 'gestion'],
        ])('%s lo ve deshabilitado, con la nota de quién es el responsable', async (_, username) => {
            renderPage(1, username)
            await headerOf('Causa 13284571')

            expect(screen.getByRole('button', { name: 'Registrar acto procesal' })).toBeDisabled()
            expect(
                screen.getByText('Solo el abogado responsable (Dra. Malena Ríos) registra actos.'),
            ).toBeInTheDocument()
        })

        it('el responsable no ve esa nota', async () => {
            renderPage(1, 'mrios')
            await headerOf('Causa 13284571')

            expect(screen.queryByText(/Solo el abogado responsable/)).not.toBeInTheDocument()
        })
    })

    describe('causa inexistente (CA-22.6)', () => {
        it('informa que la causa no fue encontrada', async () => {
            renderPage(9999)

            expect(await screen.findByText('No se pudo cargar la causa')).toBeInTheDocument()
            expect(screen.getByText('No se encontró la causa solicitada.')).toBeInTheDocument()
        })

        it('una dirección que no es un identificador de causa no consulta nada', async () => {
            renderPage('abc')

            expect(await screen.findByText('No se encontró la causa')).toBeInTheDocument()
            expect(screen.getByText('La dirección no corresponde a ninguna causa.')).toBeInTheDocument()
        })
    })

    describe('estados de la consulta', () => {
        it('mientras carga, lo avisa', async () => {
            renderPage(1)

            expect(screen.getByText('Cargando causa…')).toBeInTheDocument()
            // Se espera a que termine: si no, el pedido queda colgando.
            await headerOf('Causa 13284571')
        })

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

    /* Fuera de alcance: modificar y dar de baja una causa son HU-19 y HU-21
       (Sprint 3), y los escritos y la carátula imprimible son de otras
       historias (V3 §8.3). */
    it('no ofrece modificar, dar de baja ni emitir documentos', async () => {
        renderPage(1)
        await headerOf('Causa 13284571')

        for (const name of ['Modificar causa', 'Dar de baja', 'Emitir carátula', 'Emitir expediente']) {
            expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
        }
    })
})
