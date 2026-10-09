import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../unit/mocks/helpers'
import { server } from '@/shared/mocks/server'
import { errorBody, LAWYERS, PROCEDURAL_STATES } from '@/shared/mocks'
import type { Jurisdiction } from '@/features/legal-params'
import { ALL_STATES } from '@/features/cases/utils/stateFilter'
import { CasesPage } from '@/features/cases/pages/CasesPage'

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
 * | 13250674 | 24/09, en 7 días | |
 * | 13560902 | 29/09, en 10 días | |
 * | 13345092 | 06/10, en 15 días | |
 * | 12998740 | 09/10, en 18 días | |
 * | 11845620 | — | En un estado que no abre plazo |
 * | 14118903 | — | "Iniciada" |
 * | 10556781 | — | Archivada. De Ríos |
 * | 10230417 | — | Prescripta |
 * | 14120566 | — | "Iniciada" |
 * | 13902244 | — | Amparo contra APROSS, sin plazo |
 * | 12881406 | — | Archivada. Ya es de la página 2 |
 * | 13619027 | — | Amparo contra APROSS, "Iniciada" |
 * | Sin SAC | — | "Iniciada" |
 */

const WITH_DEADLINE = [
    '12104893', '12907344', '12774310', '11990352', '13284571', '12660318', '13488127',
    '14002188', '13077215', '13711859', '13250674', '13560902', '13345092', '12998740',
]
const WITHOUT_DEADLINE = [
    '11845620', '14118903', '10556781', '10230417', '14120566', '13902244', '12881406', '13619027', 'Sin SAC',
]
const FIRST_PAGE = [...WITH_DEADLINE, ...WITHOUT_DEADLINE.slice(0, 6)]
const SECOND_PAGE = WITHOUT_DEADLINE.slice(6)
const TOTAL = WITH_DEADLINE.length + WITHOUT_DEADLINE.length

/** Las del fuero de amparo: cuatro con vencimiento y dos sin. */
const AMPARO = ['12774310', '13488127', '14002188', '13711859', '13902244', '13619027']
/** Las que llevan su primer acto pendiente: siguen en el estado inicial. */
const INITIAL = ['14118903', '14120566', '13619027', 'Sin SAC']
/** Las tres causas de la Dra. Malena Ríos. */
const OF_RIOS = ['12104893', '13284571', '10556781']

const TABLE_STATE = 'Oposición al requerimiento de elevación'
const CUSTOM_STATE = 'Con acusación, pero con oposición'
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

/** El texto del chip de vencimiento de cada fila, sin la fecha. */
const listedDeadlines = () =>
    caseRows().map((row) => within(row).getByText(/^(Vencido hace|Vence hoy|En \d+ día|Sin plazo abierto)/).textContent)

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
const lawyerSelect = () => screen.getByRole('combobox', { name: 'Filtrar por responsable' })
const stateSelect = () => screen.getByRole('combobox', { name: 'Filtrar por estado procesal' })
const openDeadlineButton = () => screen.getByRole('button', { name: 'Solo con plazo por vencer' })

/** Elige una opción por su texto. Los abogados y los estados llegan del servidor: se espera a que estén. */
async function choose(user: User, select: () => HTMLElement, option: string) {
    await within(select()).findByRole('option', { name: option })
    await user.selectOptions(select(), option)
}

/** Los grupos del filtro de estado, con las opciones de cada uno. */
const stateGroups = () =>
    within(stateSelect()).queryAllByRole('group').map((group) => ({
        group: group.getAttribute('label'),
        options: within(group).queryAllByRole('option').map((option) => option.textContent),
    }))

/** Los estados de la tabla de un fuero, como los tiene el mock. */
const statesOf = (jurisdiction: Jurisdiction) =>
    PROCEDURAL_STATES.filter((s) => s.active && s.jurisdiction === jurisdiction).map((s) => s.name)

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

        /* CA-20.1: las que no tienen vencimiento van al final, también al pasar de página. */
        it('la segunda página trae las últimas sin vencimiento', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await user.click(screen.getByRole('button', { name: 'Siguiente' }))

            await expectSacs(SECOND_PAGE)
        })

        /* CA-20.1 y CA-20.5 */
        it('quedan primero las vencidas, después las que vencen hoy y las próximas, y al final las que no tienen plazo', async () => {
            renderPage()
            await screen.findByText(LOADED)

            expect(listedDeadlines()).toEqual([
                'Vencido hace 7 días',
                'Vencido hace 2 días',
                'Vence hoy',
                'Vence hoy',
                'En 1 día hábil',
                'En 2 días hábiles',
                'En 2 días hábiles',
                'En 3 días hábiles',
                'En 4 días hábiles',
                'En 6 días hábiles',
                'En 7 días hábiles',
                'En 10 días hábiles',
                'En 15 días hábiles',
                'En 18 días hábiles',
                ...Array<string>(6).fill('Sin plazo abierto'),
            ])
        })

        /* CA-20.5, y lo que la historia pide conocer de cada causa: su estado
           procesal, su responsable, su fuero y su próximo vencimiento. */
        it('muestra de cada causa el fuero, el estado, el responsable y el vencimiento con su fecha', async () => {
            renderPage()
            await screen.findByText(LOADED)

            const overdue = within(rowOf('12104893'))
            expect(overdue.getByText('GÓMEZ, Ariel Fernando p.s.a. Amenazas coactivas')).toBeInTheDocument()
            expect(overdue.getByText('Penal')).toBeInTheDocument()
            expect(overdue.getByText('Ofrecimiento de prueba')).toBeInTheDocument()
            expect(overdue.getByText('Dra. Malena Ríos')).toBeInTheDocument()
            expect(overdue.getByText('Vencido hace 7 días')).toBeInTheDocument()
            expect(overdue.getByText('04/09/2026')).toBeInTheDocument()

            const today = within(rowOf('12774310'))
            expect(today.getByText('Amparo')).toBeInTheDocument()
            expect(today.getByText('Traslado a la demandada')).toBeInTheDocument()
            expect(today.getByText('Dr. Fernando G. Vázquez')).toBeInTheDocument()
            expect(today.getByText('Vence hoy')).toBeInTheDocument()
            expect(today.getByText('15/09/2026')).toBeInTheDocument()

            const soon = within(rowOf('13284571'))
            expect(soon.getByText(TABLE_STATE)).toBeInTheDocument()
            expect(soon.getByText('En 1 día hábil')).toBeInTheDocument()
            expect(soon.getByText('16/09/2026')).toBeInTheDocument()

            const far = within(rowOf('12998740'))
            expect(far.getByText('Administrativo')).toBeInTheDocument()
            expect(far.getByText('En 18 días hábiles')).toBeInTheDocument()
            expect(far.getByText('09/10/2026')).toBeInTheDocument()

            const withoutDeadline = within(rowOf('11845620'))
            expect(withoutDeadline.getByText('Sin plazo abierto')).toBeInTheDocument()
            expect(withoutDeadline.queryByText(/\d{2}\/\d{2}\/\d{4}/)).not.toBeInTheDocument()
        })

        /* CA-20.7: todo el estudio accede a todas las causas, también a las que no lleva. */
        it.each([
            ['el administrador', 'fvazquez'],
            ['un abogado', 'mrios'],
            ['la Secretaría', 'gestion'],
            ['un administrador que no ejerce', 'supervision'],
        ])('%s ve todas las causas del estudio', async (_, username) => {
            renderPage(username)

            expect(await screen.findByText(LOADED)).toBeInTheDocument()
            expect(listedSacs()).toEqual(FIRST_PAGE)
            expect(pagerCount(TOTAL)).toBeInTheDocument()
        })

        /* Sin criterio de aceptación: TESTING.md §7 pide el estado de carga de cada página. */
        it('mientras carga, lo avisa', async () => {
            renderPage()

            expect(screen.getByText('Cargando causas…')).toBeInTheDocument()
            // Se espera a que termine: si no, el pedido queda colgando para el test siguiente.
            expect(await screen.findByText(LOADED)).toBeInTheDocument()
        })

        /* Sin criterio de aceptación: TESTING.md §7 pide el estado de error. Leer
           causas está abierto a cualquier perfil, así que el rechazo se fuerza. */
        it('si el servidor rechaza la consulta, muestra el error', async () => {
            server.use(
                http.get('*/cases', () =>
                    HttpResponse.json(errorBody('FORBIDDEN', 'Rechazo de prueba.'), { status: 403 }),
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
            ['la carátula', 'apross', ['12774310', '13902244', '13619027']],
            ['el apellido y los nombres del cliente', 'gomez, ariel', ['12104893', '13284571']],
        ])('busca por %s', async (_, text, found) => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await user.type(searchBox(), text)

            await expectSacs(found)
        })

        /* CA-20.2: el texto del prototipo dice por qué se puede buscar. */
        it('el buscador dice por qué se puede buscar', async () => {
            renderPage()
            await screen.findByText(LOADED)

            expect(searchBox()).toHaveAttribute('placeholder', 'Buscar por SAC, carátula o cliente')
        })

        /* CA-20.2 */
        it('al buscar vuelve a la primera página', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)
            await user.click(screen.getByRole('button', { name: 'Siguiente' }))
            await expectSacs(SECOND_PAGE)

            await user.type(searchBox(), '1328')

            // Si se quedara en la página 2, la búsqueda no mostraría nada.
            await expectSacs(['13284571'])
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

        /* CA-20.3 y CA-20.8 */
        it('por abogado responsable, muestra las causas a cargo de ese profesional', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await choose(user, lawyerSelect, 'Dra. Malena Ríos')

            await expectSacs(OF_RIOS)
            expect(new Set(column(4))).toEqual(new Set(['Dra. Malena Ríos']))
        })

        /* CA-20.8: la carga de trabajo se puede consultar de cualquier abogado del estudio. */
        it('ofrece a todos los abogados del estudio', async () => {
            renderPage()
            await screen.findByText(LOADED)
            await within(lawyerSelect()).findByRole('option', { name: 'Dra. Malena Ríos' })

            expect(within(lawyerSelect()).getAllByRole('option').map((o) => o.textContent)).toEqual([
                'Todos los responsables',
                ...LAWYERS.filter((l) => l.active).map((l) => l.fullName),
            ])
        })

        /* CA-20.6 y CA-20.8: una abogada que todavía no tiene causas a cargo. */
        it('un responsable sin causas deja el listado vacío y lo informa', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await choose(user, lawyerSelect, 'Dra. Julieta Campos')

            expect(await screen.findByText(EMPTY)).toBeInTheDocument()
            expect(screen.getByText('Sin resultados')).toBeInTheDocument()
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

        /* CA-20.3 */
        it('apretarlo de nuevo vuelve a mostrar todas', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)
            await user.click(openDeadlineButton())
            await expectSacs(WITH_DEADLINE)

            await user.click(openDeadlineButton())

            await expectSacs(FIRST_PAGE)
            expect(openDeadlineButton()).toHaveAttribute('aria-pressed', 'false')
        })

        /* CA-20.3: los filtros se suman. */
        it('combina los filtros: los amparos con plazo por vencer', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await choose(user, jurisdictionSelect, 'Amparo')
            await user.click(openDeadlineButton())

            await expectSacs(AMPARO.slice(0, 4))
        })

        /* CA-20.3 */
        it('al filtrar vuelve a la primera página', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)
            await user.click(screen.getByRole('button', { name: 'Siguiente' }))
            await expectSacs(SECOND_PAGE)

            await choose(user, jurisdictionSelect, 'Amparo')

            // Si se quedara en la página 2, el filtro no mostraría nada.
            await expectSacs(AMPARO)
        })

        /* Sin criterio de aceptación: sale de la pantalla Causas del prototipo. */
        it('"Limpiar filtros" saca todos los filtros y vuelve al listado completo', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)
            await choose(user, jurisdictionSelect, 'Amparo')
            await user.click(openDeadlineButton())
            await expectSacs(AMPARO.slice(0, 4))

            await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

            await expectSacs(FIRST_PAGE)
            expect(jurisdictionSelect()).toHaveDisplayValue('Todos los fueros')
            expect(openDeadlineButton()).toHaveAttribute('aria-pressed', 'false')
            expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
        })
    })

    describe('filtro de estado procesal', () => {
        /* CA-20.4: las tres clases, cada una en su grupo. "Iniciada" es fija; los
           escritos a mano salen de `GET /cases/custom-states`. */
        it('ofrece los estados de cada fuero, "Iniciada" y los escritos a mano en causas', async () => {
            renderPage()
            await screen.findByText(LOADED)

            await waitFor(() =>
                expect(stateGroups()).toEqual([
                    { group: 'Fuero Penal', options: statesOf('CRIMINAL') },
                    { group: 'Fuero Administrativo', options: statesOf('ADMINISTRATIVE') },
                    { group: 'Fuero Amparo', options: statesOf('AMPARO') },
                    { group: 'Causas nuevas', options: ['Iniciada'] },
                    { group: 'Escritos a mano en causas', options: [CUSTOM_STATE] },
                ]),
            )
        })

        /* CA-20.4 */
        it('por un estado de la tabla del fuero', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await choose(user, stateSelect, TABLE_STATE)

            await expectSacs(['13284571'])
        })

        /* CA-20.4 */
        it('por el estado inicial "Iniciada"', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await choose(user, stateSelect, 'Iniciada')

            await expectSacs(INITIAL)
            expect(new Set(column(3))).toEqual(new Set(['Iniciada']))
        })

        /* CA-20.4 */
        it('por un estado escrito a mano en una causa', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await choose(user, stateSelect, CUSTOM_STATE)

            await expectSacs(['13077215'])
            expect(column(3)).toEqual([CUSTOM_STATE])
        })

        /* CA-20.4: son excluyentes. Si al cambiar de opción viajaran dos clases a
           la vez, el servidor respondería 400 y se vería el error en vez del listado. */
        it('al pasar de una clase a otra, la nueva reemplaza a la anterior', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await choose(user, stateSelect, TABLE_STATE)
            await expectSacs(['13284571'])

            await choose(user, stateSelect, 'Iniciada')
            await expectSacs(INITIAL)

            await choose(user, stateSelect, CUSTOM_STATE)
            await expectSacs(['13077215'])

            await choose(user, stateSelect, TABLE_STATE)
            await expectSacs(['13284571'])

            expect(screen.queryByText('No se pudieron cargar las causas')).not.toBeInTheDocument()
        })

        /* CA-20.4: con un fuero elegido, la tabla que se ofrece es la de ese fuero.
           En amparo ninguna causa tiene un estado escrito a mano. */
        it('con un fuero elegido ofrece sólo sus estados, e "Iniciada"', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)

            await choose(user, jurisdictionSelect, 'Amparo')

            await waitFor(() =>
                expect(stateGroups()).toEqual([
                    { group: 'Fuero Amparo', options: statesOf('AMPARO') },
                    { group: 'Causas nuevas', options: ['Iniciada'] },
                ]),
            )
        })

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

        /* CA-20.4: "Iniciada" no depende del fuero. */
        it('"Iniciada" se conserva al cambiar de fuero', async () => {
            const { user } = renderPage()
            await screen.findByText(LOADED)
            await choose(user, stateSelect, 'Iniciada')
            await expectSacs(INITIAL)

            await choose(user, jurisdictionSelect, 'Amparo')

            await expectSacs(['13619027'])
            expect(stateSelect()).toHaveDisplayValue('Iniciada')
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

        /* Sin criterio de aceptación: es el botón del encabezado en el prototipo,
           y la entrada al alta (HU-18). */
        it('"Registrar causa" lleva al alta', async () => {
            const { user, router } = renderPage()
            await screen.findByText(LOADED)

            await user.click(screen.getByRole('button', { name: 'Registrar causa' }))

            expect(await screen.findByText('Pantalla de registrar causa')).toBeInTheDocument()
            expect(router.state.location.pathname).toBe('/causas/nueva')
        })

        /* Fuera de alcance: modificar y dar de baja una causa son HU-19 y HU-21,
           y consultar las dadas de baja también es de HU-21 (V3 §8.3). */
        it('no ofrece modificar ni dar de baja una causa, ni ver las dadas de baja', async () => {
            renderPage()
            await screen.findByText(LOADED)

            for (const name of ['Modificar', 'Modificar causa', 'Eliminar', 'Dar de baja']) {
                expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
            }
            expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
            expect(screen.queryByText(/dadas de baja/i)).not.toBeInTheDocument()
        })
    })
})
