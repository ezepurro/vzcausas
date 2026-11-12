import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * Dar de baja una causa (HU-21), con el botón "Dar de baja" del detalle. Los
 * textos salen del prototipo: el diálogo "Dar de baja la causa", el campo
 * "Motivo (opcional)", el botón "Dar de baja" y el aviso "Causa dada de baja.
 * Se conserva el historial completo.", que vuelve al listado.
 *
 * La causa 2 es administrativa (SAC 12907344) y la lleva `iperalta`; la da de
 * baja `gestion`, porque la Secretaría opera cualquier causa (D-110). `mrios`,
 * que sólo es abogado y no la lleva, no puede.
 *
 * @backend CA-21.3 CA-21.4 CA-21.5 CA-21.6 CA-21.7 CA-21.8 CA-21.9 CA-21.10
 * (que la causa desaparezca de listados, tableros y conteos, que su SAC
 * quede libre y su carpeta intacta lo resuelve el servidor)
 */

function renderPage(caseId: number, as = 'gestion') {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
        routes: [{ path: '/causas', element: <p>Listado de causas</p> }],
    })
}

async function openDelete(user: ReturnType<typeof renderPage>['user']) {
    await screen.findByRole('region', { name: 'Causa 12907344' })
    await user.click(screen.getByRole('button', { name: 'Dar de baja' }))
    return screen.getByRole('dialog', { name: /Dar de baja la causa/ })
}

describe('CaseDetailPage · dar de baja la causa', () => {
    usePrototypeToday()

    // CA-21.1, CA-21.2: la Secretaría, con el motivo opcional.
    it('con un motivo, la baja vuelve al listado y el motivo se guarda', async () => {
        const { user } = renderPage(2)
        const dialog = await openDelete(user)

        await user.type(within(dialog).getByLabelText(/^motivo/i), 'Causa duplicada.')
        await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }))

        expect(await screen.findByText('Listado de causas')).toBeInTheDocument()
        expect(screen.getByText('Causa dada de baja. Se conserva el historial completo.')).toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 2)).toMatchObject({ active: false, deactivation: { reason: 'Causa duplicada.' } })
    })

    // CA-21.2: sin motivo también procede.
    it('sin motivo, la baja procede igual', async () => {
        const { user } = renderPage(2)
        const dialog = await openDelete(user)

        await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }))

        expect(await screen.findByText('Listado de causas')).toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 2)?.deactivation?.reason).toBeNull()
    })

    // CA-21.1 (D-110): el abogado responsable da de baja su causa.
    it('el abogado responsable la da de baja', async () => {
        const { user } = renderPage(2, 'iperalta')
        const dialog = await openDelete(user)

        await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }))

        expect(await screen.findByText('Listado de causas')).toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 2)?.active).toBe(false)
    })

    // CA-21.11 (D-110): un abogado que no es el responsable no la da de baja.
    it('un abogado que no es el responsable ve "Dar de baja" deshabilitado', async () => {
        renderPage(2, 'mrios')
        await screen.findByRole('region', { name: 'Causa 12907344' })

        const button = screen.getByRole('button', { name: 'Dar de baja' })
        expect(button).toBeDisabled()
        expect(button).toHaveAttribute('title', expect.stringMatching(/^Solo el abogado responsable/))
    })

    // Mínimo por feature (TESTING.md §11): si falla, no sale del detalle.
    it('si el servidor rechaza la baja, muestra su mensaje y la causa sigue', async () => {
        server.use(
            http.delete('*/cases/:caseId', () =>
                HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Ocurrió un error interno inesperado.'), { status: 500 }),
            ),
        )
        const { user } = renderPage(2)
        const dialog = await openDelete(user)

        await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }))

        expect(await screen.findByText('Ocurrió un error interno inesperado.')).toBeInTheDocument()
        expect(screen.queryByText('Listado de causas')).not.toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 2)?.active).toBe(true)
    })
})
