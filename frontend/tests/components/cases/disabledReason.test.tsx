import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { resetMockDb } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'
import { LawyersPage } from '@/features/lawyers/pages/LawyersPage'

/**
 * El motivo de un botón deshabilitado está a la vista y unido al botón (H-53
 * de `docs/auditoria-front`). Antes iba sólo en el `title`, que no se ve en el
 * teléfono ni se alcanza con el teclado. El `title` se conserva.
 */
describe('motivo visible de un botón deshabilitado (H-53)', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
        resetMockDb()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    describe('Abogados', () => {
        const NOTE = 'Solo el Administrador registra y modifica abogados.'

        it('a la Secretaría le dice por qué no registra ni modifica', async () => {
            renderWithProviders(<LawyersPage />, { as: 'gestion', path: '/abogados', route: '/abogados' })
            const edits = await screen.findAllByRole('button', { name: 'Modificar' })

            expect(screen.getByText(NOTE)).toBeVisible()
            expect(screen.getByRole('button', { name: 'Registrar abogado' })).toHaveAccessibleDescription(NOTE)
            // Cada "Modificar" sigue diciendo de quién es, y suma el motivo.
            expect(edits[0]).toBeDisabled()
            expect(edits[0]).toHaveAccessibleDescription(new RegExp(`${NOTE.replace('.', '\\.')}$`))
            expect(edits[0].getAttribute('aria-describedby')).toMatch(/^lawyer-row-\d+ /)
        })

        it('al Administrador no le muestra la nota', async () => {
            renderWithProviders(<LawyersPage />, { as: 'fvazquez', path: '/abogados', route: '/abogados' })
            const edits = await screen.findAllByRole('button', { name: 'Modificar' })

            expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
            expect(edits[0].getAttribute('aria-describedby')).toMatch(/^lawyer-row-\d+$/)
        })
    })

    describe('Detalle de causa', () => {
        function renderPage(caseId: number, as: string) {
            return renderWithProviders(<CaseDetailPage />, {
                as,
                path: '/causas/:caseId',
                route: `/causas/${caseId}`,
            })
        }

        // La causa 4 es de `fvazquez`: `mrios` es abogado pero no su responsable (D-110).
        it('a un abogado que no es el responsable le dice por qué no la modifica ni la da de baja', async () => {
            renderPage(4, 'mrios')
            await screen.findByRole('region', { name: 'Causa 11845620' })

            const reason = /^Solo el abogado responsable \(.+\) modifica o da de baja la causa\.$/
            expect(screen.getByText(reason)).toBeVisible()
            expect(screen.getByRole('button', { name: 'Modificar causa' })).toHaveAccessibleDescription(reason)
            expect(screen.getByRole('button', { name: 'Dar de baja' })).toHaveAccessibleDescription(reason)
        })

        it('y por qué no marca prescripta la causa ni sus calificaciones', async () => {
            renderPage(4, 'mrios')
            await screen.findByRole('region', { name: 'Causa 11845620' })

            const reason = /^Solo el abogado responsable \(.+\) marca prescripta la causa o sus calificaciones\.$/
            expect(screen.getByText(reason)).toBeVisible()
            expect(screen.getByRole('button', { name: 'Marcar toda la causa prescripta' }))
                .toHaveAccessibleDescription(reason)
            for (const button of screen.getAllByRole('button', { name: /^Marcar prescripta: / })) {
                expect(button).toBeDisabled()
                expect(button).toHaveAccessibleDescription(reason)
            }
        })

        // Tanda 15: la nota de los actos estaba a la vista, pero sin unir a sus botones.
        it('y por qué no registra actos, procesales ni interruptivos', async () => {
            renderPage(4, 'mrios')
            await screen.findByRole('region', { name: 'Causa 11845620' })

            const reason = /^Solo el abogado responsable \(.+\) registra actos\.$/
            expect(screen.getByText(reason)).toBeVisible()
            for (const name of ['Registrar acto procesal', 'Registrar acto interruptivo']) {
                const button = screen.getByRole('button', { name })
                expect(button).toBeDisabled()
                expect(button).toHaveAccessibleDescription(reason)
            }
        })

        it('al responsable no le muestra ninguna de las notas', async () => {
            renderPage(1, 'mrios')
            await screen.findByRole('region', { name: 'Causa 13284571' })

            expect(screen.queryByText(/modifica o da de baja la causa\.$/)).not.toBeInTheDocument()
            expect(screen.queryByText(/marca prescripta la causa o sus calificaciones\.$/)).not.toBeInTheDocument()
            expect(screen.queryByText(/registra actos\.$/)).not.toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Modificar causa' })).not.toHaveAttribute('aria-describedby')
            expect(screen.getByRole('button', { name: 'Registrar acto procesal' })).not.toHaveAttribute('aria-describedby')
        })

        /* Tanda 15: el Administrador sin otro rol no baja los documentos que no
           son expedientes (D-103). La causa 1 tiene de los dos. */
        describe('Documentación', () => {
            const NOTE = 'Solo el Abogado y la Secretaría descargan los documentos que no son expedientes.'
            const rowOf = async (name: string) => (await screen.findByText(name)).closest('li') as HTMLElement

            it('al Administrador le dice por qué no descarga un documento, y el expediente queda sin nota', async () => {
                renderPage(1, 'supervision')
                const cedula = await rowOf('Cédula de notificación.pdf')
                const expediente = await rowOf('Expediente_13284571_v1.pdf')

                expect(screen.getByText(NOTE)).toBeVisible()
                const blocked = within(cedula).getByRole('button', { name: 'Descargar' })
                expect(blocked).toBeDisabled()
                expect(blocked).toHaveAccessibleDescription(NOTE)
                const allowed = within(expediente).getByRole('button', { name: 'Descargar' })
                expect(allowed).toBeEnabled()
                expect(allowed).not.toHaveAttribute('aria-describedby')
            })

            it('a quien los descarga no le muestra la nota', async () => {
                renderPage(1, 'mrios')
                await rowOf('Cédula de notificación.pdf')

                expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
            })
        })
    })
})
