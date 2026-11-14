import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { errorBody } from '@/shared/mocks'
import { queryClient } from '@/shared/api/queryClient'
import { CasesPage } from '@/features/cases/pages/CasesPage'
import { RegisterCasePage } from '@/features/cases/pages/RegisterCasePage'

/**
 * Pantallas de causas con lo que piden fallando (tanda 14 de
 * `docs/auditoria-front`).
 *
 * Sin reintentos automáticos en estos tests: con un 500 la consulta reintenta
 * dos veces con espera (`queryClient.ts`), y lo que se prueba es lo que se ve
 * después.
 */

const SERVER_ERROR = () =>
    HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor. Intentá de nuevo en unos minutos.'), { status: 500 })

let defaults: ReturnType<typeof queryClient.getDefaultOptions>
beforeEach(() => {
    defaults = queryClient.getDefaultOptions()
    queryClient.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } })
})
afterEach(() => {
    queryClient.setDefaultOptions(defaults)
})

describe('el listado de causas, si no carga', () => {
    it('lo anuncia y "Reintentar" lo vuelve a pedir', async () => {
        server.use(http.get('*/cases', SERVER_ERROR, { once: true }))
        const { user } = renderWithProviders(<CasesPage />, { as: 'gestion', route: '/causas' })

        const alert = await screen.findByRole('alert')
        expect(alert).toHaveTextContent('No se pudieron cargar las causas')
        expect(alert).toHaveTextContent('Error del servidor. Intentá de nuevo en unos minutos.')

        // La segunda vez el servidor responde.
        await user.click(screen.getByRole('button', { name: 'Reintentar' }))

        expect(await screen.findByText('GÓMEZ, Ariel Fernando p.s.a. Robo calificado')).toBeInTheDocument()
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
})

describe('"Registrar causa", si sus listas no cargan', () => {
    function renderPage() {
        return renderWithProviders(<RegisterCasePage />, { as: 'gestion', path: '/causas/nueva', route: '/causas/nueva' })
    }

    it('el selector de cliente dice que no se pudieron cargar, no que ninguno coincide', async () => {
        server.use(http.get('*/clients', SERVER_ERROR))
        const { user } = renderPage()

        await user.click(await screen.findByRole('combobox', { name: /^Cliente/ }))

        expect(await screen.findByText(/^No se pudieron cargar los clientes\. Recargá la página/)).toBeInTheDocument()
        expect(screen.queryByText('Ningún cliente coincide.')).not.toBeInTheDocument()
    })

    it('el responsable lo dice debajo del campo, unido a él', async () => {
        server.use(http.get('*/lawyers', SERVER_ERROR))
        renderPage()

        const select = await screen.findByLabelText(/^Abogado responsable/)
        expect(await screen.findByText(/^No se pudieron cargar los abogados\./)).toBeInTheDocument()
        expect(select).toHaveAccessibleDescription(
            'No se pudieron cargar los abogados. Recargá la página para volver a intentar.',
        )
    })

    it('el selector de calificaciones también', async () => {
        server.use(http.get('*/legal-qualifications', SERVER_ERROR))
        const { user } = renderPage()

        await user.click(await screen.findByRole('combobox', { name: /calificaci/i }))

        expect(await screen.findByText(/^No se pudieron cargar las calificaciones\./)).toBeInTheDocument()
        expect(screen.queryByText('Ninguna calificación coincide.')).not.toBeInTheDocument()
    })
})
