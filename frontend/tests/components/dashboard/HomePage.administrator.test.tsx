import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { personNameIn } from '../../setup/names'
import { server } from '@/shared/mocks/server'
import { errorBody } from '@/shared/mocks'
import { HomePage } from '@/features/dashboard/pages/HomePage'

/**
 * El tablero del administrador, "Estudio" (HU-42), en `/inicio`. Sale de
 * `GET /dashboards/administrator` (V4 §3.11); los textos son los del inicio
 * del prototipo. Entra `supervision`, Administrador que no ejerce: no tiene
 * "Mi día".
 *
 * Con el reloj en el martes 15/09/2026 el estudio tiene 20 causas activas
 * (Penal 9, Administrativo 5, Amparo 6) y 15 plazos abiertos: 2 vencidos, 2
 * que vencen hoy, 5 en los próximos 5 días hábiles y el resto después. Uno es
 * el del acto lesivo del amparo 22 (V4 D-78).
 */

function renderPage(as = 'supervision') {
    return renderWithProviders(<HomePage />, {
        as,
        path: '/inicio',
        route: '/inicio',
        routes: [{ path: '/causas/:caseId', element: <p>Detalle de la causa</p> }],
    })
}

type User = ReturnType<typeof renderPage>['user']

/**
 * Un indicador, dentro de la banda "Indicadores": "Vencidos" también es el
 * filtro por urgencia y la leyenda de la carga del equipo.
 */
function tile(label: string): HTMLElement {
    const band = screen.getByRole('region', { name: 'Indicadores' })
    let el: HTMLElement | null = within(band).getByText(label, { exact: true })
    while (el && !/\d/.test((el.textContent ?? '').replace(label, ''))) el = el.parentElement
    if (!el) throw new Error(`No se encontró el indicador "${label}".`)
    return el
}

const tileNumber = (label: string) => (tile(label).textContent ?? '').replace(label, '').match(/\d+/)?.[0]

/** El panel de vencimientos, con el título que tenga en ese momento. */
async function deadlinesPanel() {
    const title = await screen.findByText(/^Vencimientos del (estudio|responsable)$/)
    return title.closest('section, .vz-panel') as HTMLElement
}

/** Las carátulas de los vencimientos que muestra el panel, en orden. */
async function listedCaptions() {
    const panel = await deadlinesPanel()
    return within(panel).getAllByRole('listitem')
}

async function teamMember(user: User, lastName: string, firstName: string) {
    const panel = (await screen.findByText('Carga del equipo')).closest('section, .vz-panel') as HTMLElement
    await user.click(within(panel).getByRole('button', { name: new RegExp(personNameIn(lastName, firstName)) }))
}

describe('HomePage · Estudio', () => {
    usePrototypeToday()

    // CA-42.1, CA-42.2
    it('muestra los indicadores de todo el estudio, sin "Mi día"', async () => {
        renderPage()
        await screen.findByText('Cartera por fuero')

        expect(tileNumber('Causas activas')).toBe('20')
        expect(tileNumber('Vencen hoy')).toBe('2')
        expect(tileNumber('Vencidos')).toBe('2')
        expect(tileNumber('Próx. 5 días hábiles')).toBe('5')
        expect(screen.queryByRole('tab', { name: 'Mi día' })).not.toBeInTheDocument()
    })

    // CA-42.3: siempre los tres fueros.
    it('muestra las causas activas de cada fuero', async () => {
        renderPage()

        const panel = (await screen.findByText('Cartera por fuero')).closest('section, .vz-panel') as HTMLElement
        expect(panel).toHaveTextContent(/Penal\D*9/)
        expect(panel).toHaveTextContent(/Administrativo\D*5/)
        expect(panel).toHaveTextContent(/Amparo\D*6/)
    })

    // CA-42.4: todos los plazos, los más urgentes primero, con su responsable.
    it('lista los vencimientos del estudio por urgencia, cada uno con su responsable', async () => {
        renderPage()

        const items = await listedCaptions()
        expect(items).toHaveLength(15)
        expect(items[0]).toHaveTextContent('GÓMEZ, Ariel Fernando p.s.a. Amenazas coactivas')
        expect(items[0]).toHaveTextContent(new RegExp(personNameIn('Ríos', 'Malena')))
        expect(items[1]).toHaveTextContent('PEREYRA, Marcos D. — Sumario administrativo')
        // El plazo para presentar el amparo también es un vencimiento (D-78).
        expect(items.some((i) => i.textContent?.includes('PAZ, Ezequiel c/ APROSS — Amparo'))).toBe(true)
    })

    // CA-42.10: filtrar por urgencia.
    it('el filtro "Vencidos" deja sólo los plazos vencidos', async () => {
        const { user } = renderPage()
        await listedCaptions()

        await user.click(screen.getByRole('button', { name: /^Vencidos/ }))

        const items = await listedCaptions()
        expect(items).toHaveLength(2)
    })

    // CA-42.6, CA-42.7, CA-42.10: la carga del equipo, por urgencia y con su rótulo.
    it('muestra la carga del equipo, primero quien tiene vencidos, con su rótulo', async () => {
        renderPage()

        const panel = (await screen.findByText('Carga del equipo')).closest('section, .vz-panel') as HTMLElement
        // Cada abogado es un botón: tocarlo filtra sus plazos. Ríos tiene el vencido más antiguo.
        const members = within(panel).getAllByRole('button')
        expect(members).toHaveLength(10)
        expect(members[0]).toHaveTextContent(new RegExp(personNameIn('Ríos', 'Malena')))
        expect(panel).toHaveTextContent('Con vencidos')
        expect(panel).toHaveTextContent('Vence hoy')
        expect(panel).toHaveTextContent('Atención esta semana')
        expect(panel).toHaveTextContent('Al día')
        // Todos los abogados, tengan causas o no (Campos no tiene ninguna).
        expect(panel).toHaveTextContent(new RegExp(personNameIn('Campos', 'Julieta')))
    })

    // CA-42.10: tocar un abogado deja sólo sus plazos.
    it('al tocar un abogado muestra sólo sus vencimientos', async () => {
        const { user } = renderPage()

        await teamMember(user, 'Ríos', 'Malena')

        const panel = await deadlinesPanel()
        expect(within(panel).getByText('Vencimientos del responsable')).toBeInTheDocument()
        expect(within(panel).getAllByRole('listitem')).toHaveLength(2)
    })

    // [proto]: una selección sin plazos.
    it('un abogado sin plazos deja la lista vacía, con su aviso', async () => {
        const { user } = renderPage()

        await teamMember(user, 'Campos', 'Julieta')

        expect(await screen.findByText('No hay plazos en esta selección.')).toBeInTheDocument()
    })

    // CA-42.5, CA-32.9: las alertas de todo el estudio, primero la que prescribe antes.
    it('muestra las alertas de prescripción de todo el estudio', async () => {
        renderPage()

        const panel = (await screen.findByText('Alertas de prescripción')).closest('section, .vz-panel') as HTMLElement
        const text = panel.textContent ?? ''
        expect(text.indexOf('FUNES, Claudia N.')).toBeGreaterThan(-1)
        expect(text.indexOf('FUNES, Claudia N.')).toBeLessThan(text.indexOf('ACOSTA, Jonathan E.'))
    })

    // CA-41.7: el administrador que también es abogado arranca en "Mi día" y puede pasar a "Estudio".
    it('quien también es abogado pasa de "Mi día" a "Estudio"', async () => {
        const { user } = renderPage('fvazquez')

        await user.click(await screen.findByRole('tab', { name: 'Estudio' }))

        expect(await screen.findByText('Cartera por fuero')).toBeInTheDocument()
        expect(tileNumber('Causas activas')).toBe('20')
    })

    // [equipo] dashboard/CAMBIOS.md 2026-11-09: la pestaña y los filtros viven en
    // la URL, así que volver de una causa no los pierde (ni cae en "Mi día").
    it('al volver de una causa conserva "Estudio" y el abogado elegido', async () => {
        const { user, router } = renderPage('fvazquez')

        await user.click(await screen.findByRole('tab', { name: 'Estudio' }))
        await teamMember(user, 'Ríos', 'Malena')
        const [first] = await listedCaptions()
        await user.click(within(first).getByRole('button'))
        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()

        await router.navigate(-1)

        expect(await screen.findByRole('tab', { name: 'Estudio' })).toHaveAttribute('aria-selected', 'true')
        const panel = await deadlinesPanel()
        expect(within(panel).getByText('Vencimientos del responsable')).toBeInTheDocument()
        expect(within(panel).getAllByRole('listitem')).toHaveLength(2)
    })

    // TESTING.md §7
    it('si el tablero no carga, muestra el error', async () => {
        // Un 403 y no un 500: los errores del servidor se reintentan
        // (`queryClient`) y el aviso tardaría más de lo que espera `findBy`.
        server.use(
            http.get('*/dashboards/administrator', () =>
                HttpResponse.json(errorBody('FORBIDDEN', 'Rechazo de prueba.'), { status: 403 }),
            ),
        )
        renderPage()

        expect(await screen.findByText('Rechazo de prueba.')).toBeInTheDocument()
    })
})
