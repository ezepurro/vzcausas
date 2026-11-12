import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { server } from '@/shared/mocks/server'
import { errorBody } from '@/shared/mocks'
import { HOVER_INTENT_MS } from '@/shared/hooks/useHoverIntent'
import { ALL_STATES } from '@/features/cases/utils/stateFilter'
import { CasesPage } from '@/features/cases/pages/CasesPage'
// Recorta el prefijo de la API como el servidor falso: no depende del VITE_API_URL de cada máquina.
import { normalizePath } from '@/shared/mocks/msw-handlers'

/**
 * El listado de causas (HU-20, Consultar Causas), en `/causas`. Cada test dice
 * qué criterio de aceptación cubre.
 *
 * Los datos son los del mock: 23 causas, 14 con vencimiento y 9 sin. El reloj
 * queda fijo en el día del prototipo —martes 15/09/2026—, porque los
 * vencimientos de las semillas se ubican respecto de hoy. Con ese día,
 * `GET /cases` las devuelve en este orden (V3 §3.7: por urgencia):
 *
 * | SAC | Vence | Por qué está acá |
 * | --- | --- | --- |
 * | 12104893 | 04/09, hace 7 días | Vencida. De Ríos, cliente GÓMEZ |
 * | 12907344 | 11/09, hace 2 días | Vencida. De Peralta |
 * | 12774310 | 15/09, hoy | Amparo contra APROSS |
 * | 11990352 | 15/09, hoy | |
 * | 13284571 | 16/09, en 1 día | La del prototipo. De Ríos, cliente GÓMEZ |
 * | 12660318 | 17/09, en 2 días | |
 * | 13488127 | 17/09, en 2 días | Amparo |
 * | 14002188 | 18/09, en 3 días | Amparo |
 * | 13077215 | 21/09, en 4 días | Estado escrito a mano |
 * | 13711859 | 23/09, en 6 días | Amparo |
 * | 13619027 | 23/09, en 6 días | Amparo contra APROSS, "Iniciada": vence el acto lesivo (V4 D-82) |
 * | 13250674 | 24/09, en 7 días | |
 * | 13560902 | 29/09, en 10 días | |
 * | 13345092 | 06/10, en 15 días | |
 * | 12998740 | 09/10, en 18 días | |
 * | 11845620 | — | En un estado que no abre plazo |
 * | 14118903 | — | "Iniciada" |
 * | 10556781 | — | Archivada. De Ríos |
 * | 10230417 | — | Prescripta |
 * | 14120566 | — | "Iniciada" |
 * | 13902244 | — | Amparo contra APROSS, sin plazo. Ya es de la página 2 |
 * | 12881406 | — | Archivada. Ya es de la página 2 |
 * | Sin SAC | — | "Iniciada" |
 */

const WITH_DEADLINE = [
    '12104893', '12907344', '12774310', '11990352', '13284571', '12660318', '13488127',
    '14002188', '13077215', '13711859', '13619027', '13250674', '13560902', '13345092', '12998740',
]
const WITHOUT_DEADLINE = [
    '11845620', '14118903', '10556781', '10230417', '14120566', '13902244', '12881406', 'Sin SAC',
]
const FIRST_PAGE = [...WITH_DEADLINE, ...WITHOUT_DEADLINE].slice(0, 20)
const TOTAL = WITH_DEADLINE.length + WITHOUT_DEADLINE.length

/** Las del fuero de amparo: cinco con vencimiento —una, la del acto lesivo— y una sin. */
const AMPARO = ['12774310', '13488127', '14002188', '13711859', '13619027', '13902244']

const TABLE_STATE = 'Oposición al requerimiento de elevación'
const EMPTY = 'Ninguna causa coincide con los filtros.'

/** Una causa de la primera página: cuando aparece, el listado ya cargó. */
const LOADED = '13284571'

function renderPage(as = 'gestion') {
    return renderWithProviders(<CasesPage />, {
        as,
        path: '/causas',
        route: '/causas',
        routes: [
            { path: '/causas/nueva', element: <p>Pantalla de registrar causa</p> },
            { path: '/causas/:caseId', element: <p>Detalle de la causa</p> },
        ],
    })
}

type User = ReturnType<typeof renderPage>['user']

/** Las filas de causas, sin la de los encabezados. */
const caseRows = () => screen.getAllByRole('row').slice(1)

/** Lo que dice una columna en cada fila: 0 SAC, 2 fuero, 3 estado, 4 responsable. */
const column = (index: number) => caseRows().map((row) => within(row).getAllByRole('cell')[index].textContent)

const listedSacs = () => column(0)

/**
 * Espera a que la tabla muestre exactamente esas causas, en ese orden. Mientras
 * llega una consulta la tabla sigue mostrando la anterior, así que no alcanza
 * con mirar apenas se toca un filtro.
 */
async function expectSacs(expected: string[]) {
    await waitFor(() => expect(listedSacs()).toEqual(expected))
}

const rowOf = (sac: string) => screen.getByText(sac).closest('tr') as HTMLElement

const searchBox = () => screen.getByRole('searchbox', { name: 'Buscar causa' })
const jurisdictionSelect = () => screen.getByRole('combobox', { name: 'Filtrar por fuero' })
const stateSelect = () => screen.getByRole('combobox', { name: 'Filtrar por estado procesal' })
const openDeadlineButton = () => screen.getByRole('button', { name: 'Solo con plazo por vencer' })

/** Elige una opción por su texto. Los abogados y los estados llegan del servidor: se espera a que estén. */
async function choose(user: User, select: () => HTMLElement, option: string) {
    await within(select()).findByRole('option', { name: option })
    await user.selectOptions(select(), option)
}

const pagerCount = (count: number) => screen.getByText(`${count}`, { selector: '.vz-pager__count' })

describe('CasesPage', () => {
    usePrototypeToday()

    describe('listado', () => {
        /* CA-20.1 */
        it('muestra las causas por urgencia, de a 20: primero las que tienen vencimiento', async () => {
            renderPage()

            expect(await screen.findByText(LOADED)).toBeInTheDocument()
            expect(screen.getByRole('heading', { name: 'Causas', level: 1 })).toBeInTheDocument()
            expect(listedSacs()).toEqual(FIRST_PAGE)
            expect(pagerCount(TOTAL)).toBeInTheDocument()
        })

        /* Sin criterio de aceptación: TESTING.md §7 pide el estado de error. Leer
           causas está abierto a cualquier perfil, así que el rechazo se fuerza.
           Con un 400 y no un 403: un 403 dispara la verificación de la sesión
           (`setForbiddenHandler`), y un 5xx se reintenta. */
        it('si el servidor rechaza la consulta, muestra el error', async () => {
            server.use(
                http.get('*/cases', () =>
                    HttpResponse.json(errorBody('INVALID_REQUEST', 'Rechazo de prueba.'), { status: 400 }),
                ),
            )
            renderPage()

            expect(await screen.findByText('No se pudieron cargar las causas')).toBeInTheDocument()
            expect(screen.getByText('Rechazo de prueba.')).toBeInTheDocument()
        })
    })

    describe('búsqueda', () => {
        /* CA-20.2. Qué coincide lo decide el backend; acá se prueba que la
           pantalla manda lo escrito y muestra lo que vuelve. */
        it.each<[string, string, string[]]>([
            ['el número de SAC', '1328', ['13284571']],
        ])('busca por %s', async (_, text, found) => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await user.type(searchBox(), text)

            await expectSacs(found)
        })

        /* CA-20.6 */
        it('si la búsqueda no encuentra nada, el listado queda vacío y lo informa', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await user.type(searchBox(), 'zzzz')

            expect(await screen.findByText(EMPTY)).toBeInTheDocument()
            expect(screen.queryByRole('row')).not.toBeInTheDocument()
            expect(screen.getByText('Sin resultados')).toBeInTheDocument()
        })
    })

    describe('filtros', () => {
        /* CA-20.3 */
        it('por fuero, muestra sólo las causas de ese fuero', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await choose(user, jurisdictionSelect, 'Amparo')

            await expectSacs(AMPARO)
            expect(new Set(column(2))).toEqual(new Set(['Amparo']))
            expect(pagerCount(AMPARO.length)).toBeInTheDocument()
        })

        /* CA-20.3: "por vencer" incluye las ya vencidas, que son las más urgentes. */
        it('"Solo con plazo por vencer" deja las que tienen vencimiento, vencidas incluidas', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await user.click(openDeadlineButton())

            await expectSacs(WITH_DEADLINE)
            expect(openDeadlineButton()).toHaveAttribute('aria-pressed', 'true')
            expect(screen.getByText('Vencido hace 7 días')).toBeInTheDocument()
            expect(screen.queryByText('Sin plazo abierto')).not.toBeInTheDocument()
        })

        /* Sin criterio de aceptación: sale de la pantalla Causas del prototipo. */
        it('"Limpiar filtros" saca todos los filtros y vuelve al listado completo', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)
            await choose(user, jurisdictionSelect, 'Amparo')
            await user.click(openDeadlineButton())
            await expectSacs(AMPARO.slice(0, 5))

            await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

            await expectSacs(FIRST_PAGE)
            expect(jurisdictionSelect()).toHaveDisplayValue('Todos los fueros')
            expect(openDeadlineButton()).toHaveAttribute('aria-pressed', 'false')
            expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
        })
    })

    describe('filtro de estado procesal', () => {
        /* CA-20.3 y CA-20.4: un estado del fuero penal no existe en amparo. Si
           siguiera filtrando, el desplegable diría "Todos" y el listado estaría vacío. */
        it('al cambiar de fuero, un estado del fuero anterior deja de filtrar', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)
            await choose(user, stateSelect, TABLE_STATE)
            await expectSacs(['13284571'])

            await choose(user, jurisdictionSelect, 'Amparo')

            await expectSacs(AMPARO)
            expect(stateSelect()).toHaveValue(ALL_STATES)
            expect(stateSelect()).toHaveDisplayValue('Todos los estados procesales')
        })
    })

    describe('a dónde lleva', () => {
        /* Sin criterio de aceptación: es el botón de cada fila en el prototipo,
           y la entrada al detalle de la causa (HU-22). */
        it('"Ver detalle" abre el detalle de esa causa', async () => {
            const { user, router } = renderPage()
            await screen.findByText(LOADED)

            await user.click(within(rowOf('13284571')).getByRole('button', { name: 'Ver detalle' }))

            expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
            expect(router.state.location.pathname).toBe('/causas/1')
        })

        /* Sin criterio de aceptación: es para que el detalle cargue antes.
           Apuntar a "Ver detalle" pide la causa y su línea de vida, sin navegar;
           volver a apuntar no repite los pedidos (siguen frescos). */
        it('apuntar a "Ver detalle" pide de antemano la causa y su línea de vida', async () => {
            const { user, router } = renderPage()
            await screen.findByText(LOADED)
            const requested: string[] = []
            server.events.on('request:start', ({ request }) => {
                requested.push(`${request.method} ${normalizePath(new URL(request.url).pathname)}`)
            })

            try {
                const button = within(rowOf('13284571')).getByRole('button', { name: 'Ver detalle' })
                await user.hover(button)
                await waitFor(() =>
                    expect(requested).toEqual(expect.arrayContaining(['GET /cases/1', 'GET /cases/1/timeline'])),
                )
                await user.unhover(button)
                await user.hover(button)
                // Lo que tarda en contar como intención, y algo más.
                await new Promise((resolve) => setTimeout(resolve, HOVER_INTENT_MS * 2))

                expect(requested.filter((r) => r === 'GET /cases/1')).toHaveLength(1)
                expect(router.state.location.pathname).toBe('/causas')
            } finally {
                server.events.removeAllListeners()
            }
        })

        /* Sin criterio de aceptación: la página 2 se pide recién cuando el
           mouse se queda sobre "Siguiente" (`usePrefetchPage`, con
           `useHoverIntent`), y el click la muestra sin otro pedido. Cargar la
           página 1 no la pide sola, ni la de los desplegables de filtros. */
        it('pide la página siguiente al apuntar a "Siguiente", y el click la muestra sin volver a pedirla', async () => {
            const listed: string[] = []
            server.events.on('request:start', ({ request }) => {
                const url = new URL(request.url)
                if (request.method === 'GET' && url.searchParams.has('page')) {
                    listed.push(`${normalizePath(url.pathname)}?page=${url.searchParams.get('page')}`)
                }
            })

            try {
                const { user } = renderPage()
                await screen.findByText(LOADED)
                // Lo que tarda en contar como intención, y algo más: sin apuntar, nada.
                await new Promise((resolve) => setTimeout(resolve, HOVER_INTENT_MS * 2))
                expect(listed.filter((r) => r.endsWith('page=2'))).toEqual([])

                const next = screen.getByRole('button', { name: /siguiente/i })
                await user.hover(next)
                await waitFor(() => expect(listed).toContain('/cases?page=2'))

                await user.click(next)

                expect(screen.getByText('13902244')).toBeInTheDocument()
                expect(listed.filter((r) => r === '/cases?page=2')).toHaveLength(1)
                expect(listed.filter((r) => r.endsWith('page=2') && !r.startsWith('/cases?'))).toEqual([])
            } finally {
                server.events.removeAllListeners()
            }
        })

        /* Pasar el mouse por la columna de "Ver detalle" sin quedarse en
           ninguno no pide nada: la API no recibe pedidos que nadie va a usar
           (el límite de pedidos es por IP, compartido por el estudio). */
        it('pasar el mouse de largo por varias filas no pide ninguna causa', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)
            const requested: string[] = []
            server.events.on('request:start', ({ request }) => {
                requested.push(normalizePath(new URL(request.url).pathname))
            })

            try {
                const buttons = screen.getAllByRole('button', { name: 'Ver detalle' })
                expect(buttons.length).toBeGreaterThan(5)
                for (const button of buttons) {
                    await user.hover(button)
                    await user.unhover(button)
                }
                await new Promise((resolve) => setTimeout(resolve, HOVER_INTENT_MS * 2))

                expect(requested.filter((path) => /^\/cases\/\d+/.test(path))).toEqual([])
            } finally {
                server.events.removeAllListeners()
            }
        })
    })
})
