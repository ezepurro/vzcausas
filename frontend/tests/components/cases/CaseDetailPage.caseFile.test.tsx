import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * "Generar expediente" (HU-25) en la fila "Sobre la causa" del detalle. Está
 * en todos los fueros y para cualquier perfil, como en el prototipo; los
 * actos interruptivos y "Marcar prescripta" siguen siendo sólo del penal.
 */

function renderPage(caseId: number, as = 'gestion') {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
        routes: [{ path: '/causas/:caseId/expediente', element: <p>Pantalla Generar expediente</p> }],
    })
}

describe('CaseDetailPage · generar expediente', () => {
    usePrototypeToday()

    // CA-25.1: cualquier perfil, en cualquier fuero.
    it('en una causa administrativa lleva a "Generar expediente"', async () => {
        const { user } = renderPage(2)

        await user.click(await screen.findByRole('button', { name: 'Generar expediente' }))

        expect(await screen.findByText('Pantalla Generar expediente')).toBeInTheDocument()
    })

    it('fuera del penal no ofrece los actos interruptivos ni "Marcar prescripta"', async () => {
        renderPage(2)

        expect(await screen.findByRole('button', { name: 'Generar expediente' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Registrar acto interruptivo' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Marcar prescripta' })).not.toBeInTheDocument()
    })
})
