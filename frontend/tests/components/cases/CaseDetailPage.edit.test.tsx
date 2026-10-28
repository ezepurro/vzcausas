import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * Modificar causa (HU-19), con el botón "Modificar causa" del detalle. Los
 * textos salen del formulario del prototipo: título "Modificar causa",
 * "Guardar cambios" y el aviso "Causa actualizada. El cambio queda asentado
 * con usuario y fecha.".
 *
 * La causa 1 es penal, con SAC 13284571 y cliente GÓMEZ; la lleva `mrios`.
 * Se modifica como `gestion` porque no hace falta ser el responsable (V5 §3.7).
 *
 * @backend CA-19.4 CA-19.6 CA-19.9 CA-19.10 CA-19.11 CA-19.12 CA-19.13 CA-19.14 CA-19.15
 * (datos de otro fuero, SAC ↔ fecha de inicio, carpeta en Drive, recálculos,
 * causa prescripta, causa dada de baja y auditoría los resuelve el servidor;
 * la pantalla muestra su respuesta, como en el último test)
 */

function renderPage(caseId: number, as = 'gestion') {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
    })
}

const headerOf = (name: string) => screen.findByRole('region', { name })

async function openEdit(user: ReturnType<typeof renderPage>['user']) {
    await headerOf('Causa 13284571')
    await user.click(screen.getByRole('button', { name: 'Modificar causa' }))
    return screen.getByRole('dialog', { name: /Modificar causa/ })
}

describe('CaseDetailPage · modificar causa', () => {
    usePrototypeToday()

    // CA-19.1: cualquier perfil, aunque no sea el responsable.
    it('la Secretaría corrige un dato y el detalle lo muestra', async () => {
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        const court = within(dialog).getByLabelText(/^órgano interviniente/i)
        await user.clear(court)
        await user.type(court, 'Fisc. de Distrito I, 3º turno')
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        expect(await screen.findByText('Causa actualizada. El cambio queda asentado con usuario y fecha.')).toBeInTheDocument()
        expect(screen.getByText('Fisc. de Distrito I, 3º turno')).toBeInTheDocument()
    })

    // CA-19.3 (D-95): el fuero se muestra, pero no se modifica.
    it('el fuero no se puede cambiar y lo explica', async () => {
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        expect(
            within(dialog).getByText('No se modifica. Si la causa se registró en otro fuero, dala de baja y registrala de nuevo.'),
        ).toBeInTheDocument()
        expect(within(dialog).queryByRole('combobox', { name: /^fuero/i })).not.toBeInTheDocument()
    })

    // CA-19.5: el SAC de otra causa vigente se marca en su campo.
    it('un SAC que ya tiene otra causa se rechaza en su campo', async () => {
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        const sac = within(dialog).getByLabelText(/^n° de sac/i)
        await user.clear(sac)
        await user.type(sac, '12907344')
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        expect(await within(dialog).findByText('Ya existe una causa registrada con ese número de SAC.')).toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 1)?.sacNumber).toBe('13284571')
    })

    // CA-19.7 (D-105): al cambiar el cliente, el formulario propone la carátula nueva.
    it('cambiar el cliente propone la carátula con el cliente nuevo', async () => {
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        await user.selectOptions(
            within(dialog).getByLabelText(/^cliente/i),
            within(dialog).getByRole('option', { name: /PEREYRA/ }),
        )

        expect(within(dialog).getByLabelText(/^carátula/i)).toHaveValue('PEREYRA, Marcos D. p.s.a. Robo calificado')

        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
        await screen.findByText('Causa actualizada. El cambio queda asentado con usuario y fecha.')
        expect(db.cases.find((c) => c.id === 1)).toMatchObject({ clientId: 2, caption: 'PEREYRA, Marcos D. p.s.a. Robo calificado' })
    })

    // Mínimo por feature (TESTING.md §11): el error del servidor se muestra.
    it('si el servidor rechaza el cambio, muestra su mensaje', async () => {
        server.use(
            http.patch('*/cases/:caseId', () =>
                HttpResponse.json(
                    errorBody('CASE_IN_TERMINAL_STATE', 'La causa está prescripta: no se pueden cambiar sus calificaciones legales.'),
                    { status: 422 },
                ),
            ),
        )
        const { user } = renderPage(1)
        const dialog = await openEdit(user)

        await user.type(within(dialog).getByLabelText(/^interno/i), '5')
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        expect(
            await screen.findByText('La causa está prescripta: no se pueden cambiar sus calificaciones legales.'),
        ).toBeInTheDocument()
    })
})
