import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { signInAs } from '../../setup/render'
import { queryClient } from '@/shared/api/queryClient'
import { documentTemplateKeys } from '@/features/documents/api/documentTemplates.keys'
import { useUpdateDocumentTemplate } from '@/features/documents/api/useUpdateDocumentTemplate'
import { useDeleteDocumentTemplate } from '@/features/documents/api/useDeleteDocumentTemplate'

/**
 * La caché después de modificar o dar de baja un modelo formal (HU-36, HU-37).
 *
 * Además de la pantalla Modelos, el alta de causa cuenta los modelos que se
 * copian a una causa nueva del fuero elegido ("6 modelos parametrizados para
 * el fuero Penal", `RegisterCasePage`), con `copyToNewCases` y `limit: 1`. Si
 * un modelo cambia de fuero, deja de copiarse o se da de baja, ese número
 * cambia para las causas que se registren después (CA-36.7, CA-37.3).
 */

const OVERVIEW = documentTemplateKeys.list({ limit: 100 })
const PENAL = documentTemplateKeys.list({ limit: 100, jurisdiction: 'CRIMINAL' })
const NEW_CASE_COUNT = documentTemplateKeys.list({ jurisdiction: 'CRIMINAL', copyToNewCases: true, limit: 1 })

function seed() {
    const casacion = { id: 4, name: 'Recurso de casación' }
    const page = (data: { id: number }[]) => ({
        data,
        pagination: { page: 1, limit: 100, totalItems: data.length, totalPages: 1 },
    })
    queryClient.setQueryData(OVERVIEW, page([casacion, { id: 1 }]))
    queryClient.setQueryData(PENAL, page([casacion, { id: 1 }]))
    queryClient.setQueryData(NEW_CASE_COUNT, page([casacion]))
}

const isStale = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated === true

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('modelos formales · caché de las mutaciones', () => {
    /* CA-36.7: desde la modificación, las causas nuevas reciben el modelo
       según sus fueros y su "Copiar en las causas nuevas" vigentes. */
    it('modificar marca viejos todos los listados, también el que cuenta el alta de causa', async () => {
        signInAs('mrios')
        seed()
        const { result } = renderHook(() => useUpdateDocumentTemplate(), { wrapper })

        const body = new FormData()
        body.append('copyToNewCases', 'false')
        act(() => result.current.mutate({ id: 4, body }))

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        for (const key of [OVERVIEW, PENAL, NEW_CASE_COUNT]) expect(isStale(key), JSON.stringify(key)).toBe(true)
    })

    /* CA-37.3: dado de baja, ya no se copia a las causas nuevas. */
    it('dar de baja lo saca de los listados y los marca viejos', async () => {
        signInAs('mrios')
        seed()
        const { result } = renderHook(() => useDeleteDocumentTemplate(), { wrapper })

        act(() => result.current.mutate(4))

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        for (const key of [OVERVIEW, PENAL, NEW_CASE_COUNT]) {
            expect(isStale(key), JSON.stringify(key)).toBe(true)
        }
        const penal = queryClient.getQueryData<{ data: { id: number }[] }>(PENAL)
        expect(penal?.data.map((t) => t.id)).not.toContain(4)
    })
})
