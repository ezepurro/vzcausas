import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { clientKeys } from '@/features/clients'
import { lawyerKeys } from '@/features/lawyers'
import { legalQualificationKeys, proceduralStateKeys } from '@/features/legal-params'
import { casesKeys } from '@/features/cases'
import { invalidateCaseCounters } from '@/features/cases/api/invalidateCaseCounters'
import { refreshCaseAfterAct } from '@/features/cases/api/refreshCaseAfterAct'

/**
 * Los listados de abogados, clientes, calificaciones y estados muestran
 * cuántas causas tiene cada uno. Lo calcula el backend, así que cada cambio
 * sobre una causa los deja viejos (auditoría de caché, `docs/auditoria-front`).
 */
const COUNTERS = [
    lawyerKeys.list({ page: 1 }),
    clientKeys.list({ page: 1 }),
    legalQualificationKeys.list({ page: 1 }),
    proceduralStateKeys.list({ page: 1, limit: 20, jurisdiction: 'CRIMINAL' }),
]

function seeded() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })
    for (const key of COUNTERS) queryClient.setQueryData(key, { data: [] })
    return queryClient
}

const isStale = (queryClient: QueryClient, key: readonly unknown[]) =>
    queryClient.getQueryState(key)?.isInvalidated === true

describe('invalidateCaseCounters', () => {
    it('marca viejos los cuatro listados que cuentan causas', () => {
        const queryClient = seeded()

        invalidateCaseCounters(queryClient)

        for (const key of COUNTERS) expect(isStale(queryClient, key)).toBe(true)
    })

    it('no toca las causas: de eso se ocupa cada mutación', () => {
        const queryClient = seeded()
        queryClient.setQueryData(casesKeys.detail(1), { id: 1 })

        invalidateCaseCounters(queryClient)

        expect(isStale(queryClient, casesKeys.detail(1))).toBe(false)
    })

    it('registrar un acto también los marca: la causa cambia de estado', async () => {
        const queryClient = seeded()

        await refreshCaseAfterAct(queryClient, 1)

        for (const key of COUNTERS) expect(isStale(queryClient, key)).toBe(true)
    })
})
