import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { personNameIn } from '../../setup/names'
import { orphanCase } from '../../setup/orphan'
import { db } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * Una causa huérfana en el detalle (V6 §4, "Causa huérfana", D-143): quedó
 * sin abogado responsable al dar de baja a su abogado. Sigue vigente, con sus
 * plazos. La modifican, la reasignan y la dan de baja el Administrador y la
 * Secretaría; sus actos, procesales e interruptivos, sólo el Administrador.
 * Ningún abogado.
 *
 * El mock no trae huérfanas: cada test deja huérfana la causa 1 (SAC
 * 13284571, penal, con un plazo abierto), que era de `mrios`
 * (`setup/orphan`). `supervision` es Administrador sin ficha de abogado;
 * `gestion`, Secretaría; `mrios`, sólo abogada: ni siquiera la que la llevaba
 * la opera.
 *
 * Las decisiones de pantalla (el aviso, "Asignar responsable", las notas)
 * están en `cases/CAMBIOS.md`.
 */

function renderPage(as: string) {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: '/causas/1',
    })
}

const header = () => screen.findByRole('region', { name: 'Causa 13284571' })

describe('CaseDetailPage · causa huérfana', () => {
    usePrototypeToday()
    beforeEach(() => orphanCase(1))

    it('muestra "Sin asignar" como responsable y avisa que sus plazos siguen corriendo', async () => {
        renderPage('gestion')

        expect(await header()).toHaveTextContent('Responsable Sin asignar')
        const note = screen.getByRole('note')
        expect(note).toHaveTextContent(/Esta causa no tiene abogado responsable desde el \d{2}\/\d{2}\/\d{4}\. Sus plazos y su prescripción siguen corriendo\./)
    })

    // D-143: los actos de una huérfana son del Administrador, aunque no tenga ficha.
    it('el Administrador registra actos y la reasigna', async () => {
        renderPage('supervision')
        await header()

        expect(screen.getByRole('button', { name: 'Registrar acto procesal' })).toBeEnabled()
        expect(screen.getByRole('button', { name: 'Registrar acto interruptivo' })).toBeEnabled()
        expect(screen.getByRole('button', { name: 'Modificar causa' })).toBeEnabled()
        expect(within(screen.getByRole('note')).getByRole('button', { name: 'Asignar responsable' })).toBeEnabled()
    })

    it('la Secretaría la modifica, pero no registra sus actos', async () => {
        renderPage('gestion')
        await header()

        const reason = 'En una causa sin responsable, solo el Administrador registra actos.'
        expect(screen.getByText(reason)).toBeVisible()
        expect(screen.getByRole('button', { name: 'Registrar acto procesal' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Registrar acto procesal' })).toHaveAccessibleDescription(reason)
        expect(screen.getByRole('button', { name: 'Modificar causa' })).toBeEnabled()
        expect(screen.getByRole('button', { name: 'Dar de baja' })).toBeEnabled()
    })

    it('un abogado no la opera: ni actos, ni modificarla, ni reasignarla', async () => {
        renderPage('mrios')
        await header()

        const reason = 'En una causa sin responsable, solo el Administrador registra actos, y el Administrador o la Secretaría la modifican o la dan de baja.'
        expect(screen.getByText(reason)).toBeVisible()
        for (const name of ['Registrar acto procesal', 'Modificar causa', 'Dar de baja']) {
            expect(screen.getByRole('button', { name })).toBeDisabled()
        }
        expect(screen.getByRole('button', { name: 'Registrar acto interruptivo' })).toBeDisabled()
        expect(screen.queryByRole('button', { name: 'Asignar responsable' })).not.toBeInTheDocument()
    })

    /* PATCH con `responsibleLawyerId: null` es 400 (D-143): hay que elegir uno.
       Sin tocar nada, "Guardar cambios" cierra sin validar (CA-19.2): el
       error sale al cambiar otro dato sin elegir abogado. */
    it('"Asignar responsable" pide elegir un abogado y, al guardar, deja de ser huérfana', async () => {
        const { user } = renderPage('gestion')
        await header()

        await user.click(screen.getByRole('button', { name: 'Asignar responsable' }))
        const dialog = screen.getByRole('dialog', { name: /Modificar causa/ })
        const lawyer = within(dialog).getByLabelText(/^abogado responsable/i)
        // Vacío de verdad: el select no muestra elegido a otro abogado.
        expect(lawyer).toHaveValue('')

        const court = within(dialog).getByLabelText(/^órgano interviniente/i)
        await user.clear(court)
        await user.type(court, 'Fisc. de Distrito I, 3º turno')
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
        expect(await within(dialog).findByText('Elegí el abogado responsable.')).toBeInTheDocument()

        await user.selectOptions(lawyer, within(lawyer).getByRole('option', { name: /Bustos/ }))
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        await screen.findByText('Causa actualizada. El cambio queda asentado con usuario y fecha.')
        const stored = db.cases.find((c) => c.id === 1)
        expect(stored?.responsibleLawyerId).toBe(5)
        expect(stored?.orphanedAt).toBeNull()
        await waitFor(async () =>
            expect(await header()).toHaveTextContent(new RegExp(`Responsable ${personNameIn('Bustos', 'Carolina')}`)),
        )
        expect(screen.queryByRole('note')).not.toBeInTheDocument()
    })
})
