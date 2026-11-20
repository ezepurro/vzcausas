import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, waitForSession } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { orphanCase } from '../../setup/orphan'
import { server } from '@/shared/mocks/server'
import { errorBody } from '@/shared/mocks'
import { saveFile } from '@/shared/lib/saveFile'
import { RequireAccess } from '@/app/router/RequireAccess'
import { ReportsPage } from '@/features/dashboard/pages/ReportsPage'

/**
 * "Reportes" (HU-43, V6 §3.13): el reporte mensual de gestión. El reloj está
 * en el día del prototipo, 15/09/2026: el mes en curso es septiembre y el
 * último cerrado, agosto. El mock tiene reportes desde enero de 2026.
 *
 * Los números los calcula el backend y la pantalla no los recalcula (CA-43.9):
 * acá no se testea el cálculo (TESTING.md, "Lo que no se testea a propósito").
 *
 * @backend CA-43.5 CA-43.7 CA-43.10 CA-43.11 CA-43.13 CA-43.14
 * (la foto del mes, qué causas cuentan, prescripción y plazos a la fecha de
 * corte, y el contenido del PDF)
 */

// En jsdom `saveFile` no guarda nada (no hay `createObjectURL`): se espía.
vi.mock('@/shared/lib/saveFile', () => ({ saveFile: vi.fn() }))

function renderPage(as = 'supervision', route = '/reportes') {
    return renderWithProviders(<ReportsPage />, { as, path: '/reportes', route })
}

describe('ReportsPage', () => {
    usePrototypeToday()

    // CA-43.2: sin mes elegido, el último mes cerrado.
    it('al entrar muestra el último mes cerrado', async () => {
        renderPage()

        expect(await screen.findByRole('combobox', { name: 'Mes del reporte' })).toHaveValue('2026-08')
        expect(screen.getByText('Agosto 2026', { selector: 'strong' })).toBeInTheDocument()
        expect(screen.getByText('Mes cerrado · datos al 31/08/2026')).toBeInTheDocument()
    })

    // CA-43.8: las cuatro tarjetas.
    it('muestra los cuatro indicadores', async () => {
        renderPage()

        const band = await screen.findByRole('region', { name: 'Indicadores' })
        for (const label of ['Causas activas', 'Ingresadas en el mes', 'Archivadas en el mes', 'Promedio por abogado']) {
            expect(within(band).getByText(label)).toBeInTheDocument()
        }
        // Ingresadas y archivadas comparan con julio, que tiene reporte.
        expect(within(band).getAllByText(/respecto del mes anterior/)).toHaveLength(2)
    })

    // CA-43.9: los gráficos de la pantalla.
    it('dibuja los gráficos del reporte', async () => {
        renderPage()

        for (const title of [
            'Causas activas por fuero',
            'Causas ingresadas y archivadas por mes',
            'Carga por abogado responsable',
            'Avance de la prescripción',
        ]) {
            expect(await screen.findByText(title, { selector: '.vz-panel__title' })).toBeInTheDocument()
        }
        // Decisión del 14/11/2026: los estados procesales no se dibujan.
        expect(screen.queryByText('Causas por estado procesal')).not.toBeInTheDocument()
    })

    /* D-145: las causas huérfanas son el renglón "Sin asignar" de la carga por
       abogado, sin la línea del promedio. Sin huérfanas no se dibuja. El mock
       no trae ninguna: el test deja huérfana la causa 1, penal. */
    it('la carga por abogado suma el renglón "Sin asignar" con las causas huérfanas', async () => {
        orphanCase(1)
        renderPage()

        const title = await screen.findByText('Carga por abogado responsable', { selector: '.vz-panel__title' })
        const panel = title.closest('.vz-panel') as HTMLElement
        const row = (await within(panel).findByText('Sin asignar')).closest('li') as HTMLElement
        expect(within(row).getByRole('img', { name: 'Sin asignar: Penal 1 · Administrativo 0 · Amparo 0' })).toBeInTheDocument()
        expect(row.querySelector('.vz-report-load__avg')).toBeNull()
    })

    it('sin causas huérfanas no hay renglón "Sin asignar"', async () => {
        renderPage()

        const title = await screen.findByText('Carga por abogado responsable', { selector: '.vz-panel__title' })
        const panel = title.closest('.vz-panel') as HTMLElement
        await within(panel).findAllByRole('img')
        expect(within(panel).queryByText('Sin asignar')).not.toBeInTheDocument()
    })

    // Cada barra lleva su cantidad y debajo va el detalle del mes resaltado.
    it('el gráfico de ingresadas y archivadas muestra las cantidades', async () => {
        renderPage()

        const box = await screen.findByLabelText('Detalle de agosto')
        for (const term of ['Ingresadas', 'Archivadas', 'Saldo', 'Activas al cierre']) {
            expect(within(box).getByText(term)).toBeInTheDocument()
        }
        const august = screen.getByRole('listitem', { name: /^Agosto 2026: \d+ ingresadas, \d+ archivadas$/ })
        const [admitted, archived] = /: (\d+) ingresadas, (\d+) archivadas/.exec(august.getAttribute('aria-label') ?? '')?.slice(1) ?? []
        const values = [...august.querySelectorAll('.vz-report-bars__value')].map((n) => n.textContent)
        expect(values).toEqual([admitted, archived])
    })

    // CA-43.3 y CA-43.4: el rango del selector y las flechas.
    it('el selector va del primer mes con reporte al mes en curso, marcado "(en curso)"', async () => {
        renderPage()

        const select = await screen.findByRole('combobox', { name: 'Mes del reporte' })
        const options = within(select).getAllByRole('option').map((o) => o.textContent)
        expect(options[0]).toBe('Septiembre 2026 (en curso)')
        expect(options.at(-1)).toBe('Enero 2026')
        expect(options).toHaveLength(9)
    })

    it('"Mes anterior" va un mes atrás y se deshabilita en el primer mes', async () => {
        const { user } = renderPage('supervision', '/reportes?periodo=2026-02')

        const prev = await screen.findByRole('button', { name: 'Mes anterior' })
        await waitFor(() => expect(screen.getByRole('combobox', { name: 'Mes del reporte' })).toHaveValue('2026-02'))
        await user.click(prev)

        await waitFor(() => expect(screen.getByRole('combobox', { name: 'Mes del reporte' })).toHaveValue('2026-01'))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled())
    })

    // CA-43.6: el mes en curso se distingue de uno cerrado.
    it('el mes en curso muestra "datos al" de hoy y no deja ir más adelante', async () => {
        const { user } = renderPage()

        const select = await screen.findByRole('combobox', { name: 'Mes del reporte' })
        await user.selectOptions(select, '2026-09')

        expect(await screen.findByText('Mes en curso · datos al 15/09/2026')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Último cerrado' })).toBeInTheDocument()
    })

    // CA-43.12: "Descargar PDF" baja el reporte del mismo mes.
    it('"Descargar PDF" guarda el reporte del mes que se ve', async () => {
        let requested: string | null = null
        server.events.on('request:start', ({ request }) => {
            if (request.url.includes('/reports/monthly/file')) requested = new URL(request.url).searchParams.get('period')
        })
        const { user } = renderPage()

        await screen.findByText('Agosto 2026', { selector: 'strong' })
        await user.click(screen.getByRole('button', { name: 'Descargar PDF' }))

        await waitFor(() => expect(saveFile).toHaveBeenCalledWith(expect.any(Blob), 'Reporte_2026-08.pdf'))
        expect(requested).toBe('2026-08')
        expect(await screen.findByText('Descargando Reporte_2026-08.pdf.')).toBeInTheDocument()
        server.events.removeAllListeners()
    })

    // CA-43.3: un mes de la URL fuera de rango responde 404; se puede volver al último cerrado.
    it('un mes sin reporte en la URL ofrece volver al último cerrado', async () => {
        const { user } = renderPage('supervision', '/reportes?periodo=2025-06')

        expect(await screen.findByText('No hay reporte para ese período.')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Ver el último mes cerrado' }))

        expect(await screen.findByRole('combobox', { name: 'Mes del reporte' })).toHaveValue('2026-08')
    })

    it('un período sin reporte muestra el error del servidor', async () => {
        server.use(
            http.get('*/reports/monthly', () =>
                HttpResponse.json(errorBody('MONTHLY_REPORT_NOT_FOUND', 'No hay reporte para ese período.'), { status: 404 }),
            ),
        )
        renderPage()

        expect(await screen.findByText('No se pudo cargar el reporte')).toBeInTheDocument()
        expect(screen.getByText('No hay reporte para ese período.')).toBeInTheDocument()
    })
})

// CA-43.1: solo el Administrador.
describe('Reportes · acceso', () => {
    it('quien no es Administrador ve el aviso de sin acceso', async () => {
        renderWithProviders(<RequireAccess />, {
            as: 'mrios',
            route: '/reportes',
            children: [{ path: '/reportes', element: <p>Pantalla de reportes</p> }],
        })
        await waitForSession()

        expect(screen.queryByText('Pantalla de reportes')).not.toBeInTheDocument()
        expect(screen.getByText('No tenés permiso para ver esta sección')).toBeInTheDocument()
    })
})
