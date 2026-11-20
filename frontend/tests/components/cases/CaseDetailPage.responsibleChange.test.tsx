import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { db } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * Los cambios de abogado responsable en la línea de vida (D-147, V6 §3.7,
 * "Cambio de responsable en la línea de vida"). El prototipo no los dibuja:
 * las decisiones de pantalla están en `cases/CAMBIOS.md`.
 *
 * La semilla no trae cambios (son solo hacia adelante): el test los agrega a
 * la base o los provoca modificando la causa. La causa 1 (SAC 13284571) es
 * de Ríos (3); la 7 (SAC 14118903) sigue en "Iniciada", sin actos.
 * El usuario 1 es `fvazquez` (Fernando G. Vázquez); el 8, `gestion`
 * (Gestión Estudio).
 */

function renderPage(caseId: number, as = 'gestion') {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
    })
}

/** El panel de la línea de vida, como lo busca `CaseDetailPage.timeline.test.tsx`. */
async function timeline() {
    const title = await screen.findByText('Ciclo de vida de la causa', { selector: '.vz-panel__title' })
    return title.closest('.vz-panel') as HTMLElement
}

function addChange(change: { caseId: number; previousLawyerId: number | null; newLawyerId: number | null; origin: 'LAWYER_REMOVAL' | 'MANUAL' }) {
    db.responsibleChanges.push({
        id: db.responsibleChanges.length + 1,
        changedById: 1,
        changedAt: '2026-09-14T10:15:00-03:00',
        ...change,
    })
}

describe('CaseDetailPage · cambio de responsable en la línea de vida', () => {
    usePrototypeToday()

    it('muestra de quién a quién pasó, si fue por una baja, y quién lo hizo', async () => {
        addChange({ caseId: 1, previousLawyerId: 4, newLawyerId: 3, origin: 'LAWYER_REMOVAL' })
        renderPage(1)

        const panel = await timeline()
        const item = (await within(panel).findByText('Cambio de abogado responsable')).closest('li') as HTMLElement
        expect(item).toHaveTextContent('De Peralta, Ignacio a Ríos, Malena. No modifica el estado procesal.')
        expect(within(item).getByText('Por la baja de un abogado')).toBeInTheDocument()
        expect(item).toHaveTextContent(/Registrado por Fernando G\. Vázquez el 14\/09\/2026/)
    })

    // D-143: sin abogado, "Sin asignar".
    it('una causa que quedó huérfana dice "Sin asignar"', async () => {
        addChange({ caseId: 1, previousLawyerId: 3, newLawyerId: null, origin: 'LAWYER_REMOVAL' })
        renderPage(1)

        const panel = await timeline()
        const item = (await within(panel).findByText('Quedó sin abogado responsable')).closest('li') as HTMLElement
        expect(item).toHaveTextContent('De Ríos, Malena a Sin asignar.')
    })

    // Un cambio con "Modificar causa" deja la entrada, sin la marca de la baja.
    it('cambiar el responsable con "Modificar causa" suma la entrada a la línea de vida', async () => {
        const { user } = renderPage(1)
        await screen.findByRole('region', { name: 'Causa 13284571' })

        await user.click(screen.getByRole('button', { name: 'Modificar causa' }))
        const dialog = screen.getByRole('dialog', { name: /Modificar causa/ })
        const lawyer = within(dialog).getByLabelText(/^abogado responsable/i)
        await user.selectOptions(lawyer, within(lawyer).getByRole('option', { name: /Bustos/ }))
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
        await screen.findByText('Causa actualizada. El cambio queda asentado con usuario y fecha.')

        const panel = await timeline()
        const item = (await within(panel).findByText('Cambio de abogado responsable')).closest('li') as HTMLElement
        expect(item).toHaveTextContent('De Ríos, Malena a Bustos, Carolina.')
        expect(item).toHaveTextContent(/Registrado por Gestión Estudio el/)
        expect(within(item).queryByText('Por la baja de un abogado')).not.toBeInTheDocument()
    })

    // Una causa en "Iniciada" sigue ofreciendo su primer acto aunque tenga cambios de responsable.
    it('en una causa sin actos sigue el "Registrar el primer acto", con el cambio debajo', async () => {
        addChange({ caseId: 7, previousLawyerId: 3, newLawyerId: 6, origin: 'MANUAL' })
        renderPage(7)

        const panel = await timeline()
        expect(await within(panel).findByText('Todavía no hay actos procesales')).toBeInTheDocument()
        expect(within(panel).getByRole('button', { name: 'Registrar el primer acto' })).toBeInTheDocument()
        expect(within(panel).getByText('Cambio de abogado responsable')).toBeInTheDocument()
    })
})
