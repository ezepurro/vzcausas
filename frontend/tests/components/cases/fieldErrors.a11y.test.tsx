import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { resetMockDb } from '@/shared/mocks'
import { RegisterCasePage } from '@/features/cases/pages/RegisterCasePage'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'
import { RegisterProceduralActPage } from '@/features/proceedings/pages/RegisterProceduralActPage'

/**
 * El error, la nota y lo obligatorio de cada campo llegan al control (H-35 de
 * `docs/auditoria-front`) en los formularios que no pasan por `FormModal`:
 * "Registrar causa", "Modificar causa" y "Registrar acto procesal". Antes un
 * lector de pantalla anunciaba "Carátula, cuadro de edición" sin decir que
 * había un error ni cuál.
 */
describe('errores y notas unidos al control (H-35)', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
        resetMockDb()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    describe('Registrar causa', () => {
        function renderPage() {
            return renderWithProviders(<RegisterCasePage />, {
                as: 'gestion',
                path: '/causas/nueva',
                route: '/causas/nueva',
            })
        }

        it('sin errores, lo obligatorio lo anuncia el control y la nota lo describe', async () => {
            renderPage()
            await screen.findByRole('option', { name: /^Ríos, Malena/ })

            const caption = screen.getByLabelText(/^Carátula/)
            expect(caption).toBeRequired()
            expect(caption).not.toBeInvalid()
            expect(caption).toHaveAccessibleDescription(/^Podés usar la que sugiere el resumen/)

            // Opcional: sin `aria-required`, pero con su nota.
            const sac = screen.getByLabelText(/^N° de SAC/)
            expect(sac).not.toBeRequired()
            expect(sac).toHaveAccessibleDescription(/^Opcional\./)

            expect(screen.getByLabelText(/^Cliente/)).toBeRequired()
            expect(screen.getByLabelText(/^Abogado responsable/)).toBeRequired()
            expect(screen.getByRole('radiogroup', { name: 'Rol procesal del cliente' })).toBeRequired()
        })

        it('enviado vacío, cada campo con error queda inválido y descrito por su mensaje', async () => {
            const { user } = renderPage()
            await screen.findByRole('option', { name: /^Ríos, Malena/ })

            await user.click(screen.getByRole('button', { name: 'Registrar causa' }))

            const caption = screen.getByLabelText(/^Carátula/)
            expect(caption).toBeInvalid()
            expect(caption).toHaveAccessibleDescription('La carátula es obligatoria.')

            const client = screen.getByLabelText(/^Cliente/)
            expect(client).toBeInvalid()
            expect(client).toHaveAccessibleDescription('Elegí el cliente de la causa.')

            const lawyer = screen.getByLabelText(/^Abogado responsable/)
            expect(lawyer).toBeInvalid()
            expect(lawyer).toHaveAccessibleDescription('Elegí el abogado responsable.')

            // El que no tiene error no cambia.
            expect(screen.getByLabelText(/^N° de SAC/)).not.toBeInvalid()
        })
    })

    describe('Modificar causa', () => {
        it('un error del diálogo queda unido a su campo', async () => {
            const { user } = renderWithProviders(<CaseDetailPage />, {
                as: 'mrios',
                path: '/causas/:caseId',
                route: '/causas/1',
            })
            await screen.findByRole('region', { name: 'Causa 13284571' })

            await user.click(screen.getByRole('button', { name: 'Modificar causa' }))
            const dialog = await screen.findByRole('dialog')
            const caption = within(dialog).getByLabelText(/^Carátula/)
            expect(caption).toBeRequired()

            await user.clear(caption)
            await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

            expect(caption).toBeInvalid()
            expect(caption).toHaveAccessibleDescription('La carátula es obligatoria.')
        })
    })

    describe('Registrar acto procesal', () => {
        it('enviado vacío, el estado queda inválido y descrito por su mensaje', async () => {
            const { user } = renderWithProviders(<RegisterProceduralActPage />, {
                as: 'mrios',
                path: '/causas/:caseId/acto',
                route: '/causas/1/acto',
            })

            const state = await screen.findByRole('combobox')
            expect(state).toBeRequired()
            expect(state).not.toBeInvalid()
            expect(state).toHaveAccessibleDescription(/^El acto procesal es el que mueve la causa/)

            await user.click(screen.getByRole('button', { name: 'Registrar acto' }))

            expect(state).toBeInvalid()
            expect(state.getAttribute('aria-describedby')).toBe('act-state-error')
            expect(document.getElementById('act-state-error')).not.toBeNull()
        })
    })
})
