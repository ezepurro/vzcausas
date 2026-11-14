import type { ComponentType } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { errorBody } from '@/shared/mocks'
import { queryClient } from '@/shared/api/queryClient'
import { CasesPage } from '@/features/cases/pages/CasesPage'
import { ClientsPage } from '@/features/clients/pages/ClientsPage'
import { LawyersPage } from '@/features/lawyers/pages/LawyersPage'
import { UsersPage } from '@/features/users/pages/UsersPage'
import { ProceduralStatesPage } from '@/features/legal-params/pages/ProceduralStatesPage'
import { LegalQualificationsPage } from '@/features/legal-params/pages/LegalQualificationsPage'

/**
 * El pie de un listado (`Pagination`) sin datos (H-57 de
 * `docs/auditoria-front`).
 *
 * Mientras la tabla cargaba, y cuando había fallado, el pie decía "Sin
 * resultados" con "Anterior" y "Siguiente": falso en los dos casos. Ahora el
 * pie se dibuja sólo cuando la consulta respondió. "Sin resultados" queda
 * para una búsqueda que no encuentra nada (CA-20.6, `CasesPage.test.tsx`).
 */

const LISTS: [name: string, endpoint: string, route: string, Page: ComponentType][] = [
    ['Causas', '*/cases', '/causas', CasesPage],
    ['Clientes', '*/clients', '/clientes', ClientsPage],
    ['Abogados', '*/lawyers', '/abogados', LawyersPage],
    ['Usuarios', '*/users', '/usuarios', UsersPage],
    ['Estados y plazos', '*/procedural-states', '/estados-y-plazos', ProceduralStatesPage],
    ['Calificaciones legales', '*/legal-qualifications', '/calificaciones-legales', LegalQualificationsPage],
]

const pager = () => screen.queryByRole('navigation', { name: 'Paginación' })

/* Sin reintentos automáticos: con un 500 la consulta reintenta dos veces con
   espera (`queryClient.ts`), y lo que se prueba es lo que se ve después. */
let defaults: ReturnType<typeof queryClient.getDefaultOptions>
beforeEach(() => {
    defaults = queryClient.getDefaultOptions()
    queryClient.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } })
})
afterEach(() => {
    queryClient.setDefaultOptions(defaults)
})

describe.each(LISTS)('el pie del listado de %s', (_, endpoint, route, Page) => {
    it('no se dibuja mientras carga, y aparece con los datos', async () => {
        /* El pedido del listado queda esperando hasta que el test lo suelta.
           Un handler que no devuelve nada le deja el pedido al del mock. */
        let asked = false
        let release = () => {}
        const gate = new Promise<void>((resolve) => { release = resolve })
        server.use(http.get(endpoint, async () => {
            asked = true
            await gate
        }))

        renderWithProviders(<Page />, { as: 'fvazquez', route })

        await waitFor(() => expect(asked).toBe(true))
        expect(pager()).not.toBeInTheDocument()
        expect(screen.queryByText('Sin resultados')).not.toBeInTheDocument()

        release()

        const footer = await screen.findByRole('navigation', { name: 'Paginación' })
        expect(footer).toHaveTextContent(/página 1 de \d+/)
    })

    it('no se dibuja si el listado no cargó', async () => {
        server.use(http.get(endpoint, () =>
            HttpResponse.json(
                errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor. Intentá de nuevo en unos minutos.'),
                { status: 500 },
            ),
        ))

        renderWithProviders(<Page />, { as: 'fvazquez', route })

        expect(await screen.findByRole('alert')).toHaveTextContent(/^No se pudieron cargar/)
        expect(pager()).not.toBeInTheDocument()
        expect(screen.queryByText('Sin resultados')).not.toBeInTheDocument()
    })
})
