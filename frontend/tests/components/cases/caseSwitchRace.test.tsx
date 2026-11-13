import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderWithProviders, signInAs } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { configureMocks } from '@/shared/mocks/server'
import { queryClient } from '@/shared/api/queryClient'
import { casesKeys } from '@/features/cases'
import type { Case } from '@/features/cases/types/case'
import { useUpdateCase } from '@/features/cases/api/useUpdateCase'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * Pasar de una causa a otra con una operación todavía en vuelo (tanda 13 de
 * `docs/auditoria-front`).
 *
 * `CaseDetailPage` no se desmonta al cambiar `:caseId`: con "Atrás" del
 * navegador entre dos detalles —por ejemplo, registrar una causa desde otra y
 * volver— la misma página pasa a mostrar la otra causa. Los hooks de mutación
 * reciben la causa como parámetro, y TanStack le pasa a una mutación pendiente
 * las opciones nuevas del hook: la respuesta se escribía en la causa nueva.
 * Cada uno lleva ahora una `mutationKey` con su causa (`casesKeys.mutation`):
 * al cambiar, la mutación se suelta y termina sobre la causa que la pidió.
 *
 * | Causa | Para qué |
 * | --- | --- |
 * | 1 | Con carpeta (`vz-causa-1`): la que no tiene que cambiar |
 * | 23 | Carpeta `PENDING`: la que se crea |
 */

const folderOf = (caseId: number) => queryClient.getQueryData<Case>(casesKeys.detail(caseId))?.folder

describe('cambiar de causa con una operación en vuelo', () => {
    usePrototypeToday()

    it('la carpeta creada en una causa no aparece en la causa a la que se volvió', async () => {
        const { user, router } = renderWithProviders(<CaseDetailPage />, {
            as: 'gestion',
            path: '/causas/:caseId',
            route: '/causas/1',
        })
        // La 1 queda en caché, como una causa que está antes en el historial.
        await screen.findByRole('region', { name: 'Causa 13284571' })
        await act(() => router.navigate('/causas/23'))
        await screen.findByRole('region', { name: 'Causa sin SAC' })

        configureMocks({ latencyProfile: { 'POST /cases/:caseId/folder': 300 } })
        await user.click(screen.getByRole('button', { name: /crear (la )?carpeta/i }))
        await act(() => router.navigate('/causas/1'))
        await screen.findByRole('region', { name: 'Causa 13284571' })

        await waitFor(() => expect(folderOf(23)?.status).toBe('CREATED'))
        expect(folderOf(23)?.url).toBe('https://drive.google.com/drive/folders/vz-causa-23')
        expect(folderOf(1)?.url).toBe('https://drive.google.com/drive/folders/vz-causa-1')
        expect(screen.getByRole('link', { name: 'Abrir carpeta en Drive' })).toHaveAttribute(
            'href',
            'https://drive.google.com/drive/folders/vz-causa-1',
        )
    })

    it('"Modificar causa" deja la respuesta en la causa modificada, aunque la página ya muestre otra', async () => {
        signInAs('gestion')
        queryClient.setQueryData(casesKeys.detail(2), { id: 2, caption: 'La causa 2, sin tocar' })
        configureMocks({ latencyProfile: { 'PATCH /cases/:caseId': 200 } })

        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )
        const { result, rerender } = renderHook(({ caseId }) => useUpdateCase(caseId), {
            wrapper,
            initialProps: { caseId: 1 },
        })

        act(() => result.current.mutate({ caption: 'Carátula corregida' }))
        rerender({ caseId: 2 })

        await waitFor(() =>
            expect(queryClient.getQueryData<Case>(casesKeys.detail(1))?.caption).toBe('Carátula corregida'),
        )
        expect(queryClient.getQueryData<Case>(casesKeys.detail(2))?.caption).toBe('La causa 2, sin tocar')
        // El botón de la causa nueva no queda "guardando" por la operación de la otra.
        expect(result.current.isPending).toBe(false)
    })
})
