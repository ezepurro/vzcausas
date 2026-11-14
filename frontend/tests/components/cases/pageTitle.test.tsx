import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { db, resetMockDb } from '@/shared/mocks'
import { APP_TITLE } from '@/shared/hooks/usePageTitle'
import { CasesPage } from '@/features/cases/pages/CasesPage'
import { RegisterCasePage } from '@/features/cases/pages/RegisterCasePage'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'
import { GenerateCaseFilePage } from '@/features/cases/pages/GenerateCaseFilePage'
import { RegisterProceduralActPage } from '@/features/proceedings/pages/RegisterProceduralActPage'

/**
 * El título de la pestaña del navegador en las pantallas de causas y actos
 * (H-20 de `docs/auditoria-front`): eran las cinco que faltaban y decían sólo
 * "VZ Causas". Las que cuelgan de una causa llevan su carátula, que es como se
 * la reconoce entre varias pestañas.
 */
describe('título de la pestaña en causas y actos (H-20)', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
        resetMockDb()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    /** La carátula de la causa 1, la del prototipo: `mrios` es su responsable. */
    const caption = () => db.cases.find((c) => c.id === 1)!.caption

    it('el listado se llama "Causas"', async () => {
        renderWithProviders(<CasesPage />, { as: 'gestion', path: '/causas', route: '/causas' })

        await waitFor(() => expect(document.title).toBe(`Causas · ${APP_TITLE}`))
    })

    it('el alta se llama "Registrar causa"', async () => {
        renderWithProviders(<RegisterCasePage />, { as: 'gestion', path: '/causas/nueva', route: '/causas/nueva' })

        await waitFor(() => expect(document.title).toBe(`Registrar causa · ${APP_TITLE}`))
    })

    it('el detalle lleva la carátula cuando la causa llega', async () => {
        renderWithProviders(<CaseDetailPage />, { as: 'mrios', path: '/causas/:caseId', route: '/causas/1' })

        await screen.findByRole('region', { name: 'Causa 13284571' })
        expect(document.title).toBe(`${caption()} · ${APP_TITLE}`)
    })

    it('"Generar expediente" dice la pantalla y la carátula', async () => {
        renderWithProviders(<GenerateCaseFilePage />, {
            as: 'gestion',
            path: '/causas/:caseId/expediente',
            route: '/causas/1/expediente',
        })

        await waitFor(() => expect(document.title).toBe(`Generar expediente · ${caption()} · ${APP_TITLE}`))
    })

    it('"Registrar acto procesal" dice la pantalla y la carátula', async () => {
        renderWithProviders(<RegisterProceduralActPage />, {
            as: 'mrios',
            path: '/causas/:caseId/acto',
            route: '/causas/1/acto',
        })

        await waitFor(() => expect(document.title).toBe(`Registrar acto procesal · ${caption()} · ${APP_TITLE}`))
    })

    it('al modificar un acto, el título es "Modificar acto procesal"', async () => {
        const act = db.proceduralActs.find((a) => a.caseId === 1)!

        renderWithProviders(<RegisterProceduralActPage />, {
            as: 'mrios',
            path: '/causas/:caseId/acto/:actId',
            route: `/causas/1/acto/${act.id}`,
        })

        await waitFor(() => expect(document.title).toBe(`Modificar acto procesal · ${caption()} · ${APP_TITLE}`))
    })
})
