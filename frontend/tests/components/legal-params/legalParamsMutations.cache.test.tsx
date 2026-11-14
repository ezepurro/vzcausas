import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { signInAs } from '../../setup/render'
import { queryClient } from '@/shared/api/queryClient'
import { casesKeys } from '@/features/cases'
import { dashboardKeys } from '@/features/dashboard/api/dashboards.keys'
import { useUpdateProceduralState } from '@/features/legal-params/api/useUpdateProceduralState'
import { useUpdateLegalQualification } from '@/features/legal-params/api/useUpdateLegalQualification'
import { useDeleteLegalQualification } from '@/features/legal-params/api/useDeleteLegalQualification'
import { legalQualificationKeys } from '@/features/legal-params/api/legalQualifications.keys'

/**
 * C-3 de la auditoría de caché (`docs/auditoria-front/12-REGISTRO_PLAN_A.md`):
 * el nombre y el plazo de un estado procesal o de una calificación legal no
 * se copian en la causa; los muestran el detalle, su línea de vida, el listado
 * y los tableros. Esas claves son de módulos que dependen de `legal-params`,
 * que no las puede nombrar: al modificar uno se marca vieja toda la caché,
 * igual que al modificar un abogado.
 */

const SHOWN_ELSEWHERE = [
    casesKeys.detail(1),
    casesKeys.timeline(1),
    casesKeys.list({ page: 1 }),
    dashboardKeys.lawyer(),
]

function seed() {
    for (const key of SHOWN_ELSEWHERE) queryClient.setQueryData(key, { data: [] })
}

const isStale = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated === true

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('estados y calificaciones · caché de las causas (C-3)', () => {
    it('modificar un estado procesal marca viejas las causas, su línea de vida y los tableros', async () => {
        signInAs('fvazquez')
        seed()
        const { result } = renderHook(() => useUpdateProceduralState(), { wrapper })

        act(() => result.current.mutate({ id: 2, body: { name: 'Cédula de notificación al imputado', timeLimitDays: 5 } }))

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        for (const key of SHOWN_ELSEWHERE) expect(isStale(key), JSON.stringify(key)).toBe(true)
    })

    it('modificar una calificación legal marca viejas las causas, su línea de vida y los tableros', async () => {
        signInAs('fvazquez')
        seed()
        const { result } = renderHook(() => useUpdateLegalQualification(), { wrapper })

        // Cambiar el plazo recalcula la prescripción de las causas que la registran (V4 §3.5).
        act(() => result.current.mutate({ id: 1, body: { prescriptionMonths: 120 } }))

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        for (const key of SHOWN_ELSEWHERE) expect(isStale(key), JSON.stringify(key)).toBe(true)
    })

    /* CA-50.2: una calificación dada de baja no se ofrece al registrar ni al
       modificar una causa. El selector lee el mismo listado que la tabla
       (`useQualificationOptions`, con `limit: 100`), así que la baja tiene que
       marcarlo viejo. Las causas que la registran no se tocan (CA-50.3). */
    it('dar de baja una calificación legal marca viejo el listado del selector de "Registrar causa"', async () => {
        signInAs('gestion')
        const pickerList = legalQualificationKeys.list({ page: 1, limit: 100, search: '' })
        queryClient.setQueryData(pickerList, { data: [], pagination: null })
        queryClient.setQueryData(casesKeys.detail(1), { data: [] })
        const { result } = renderHook(() => useDeleteLegalQualification(), { wrapper })

        act(() => result.current.mutate(5))

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(isStale(pickerList)).toBe(true)
        expect(isStale(casesKeys.detail(1))).toBe(false)
    })
})
