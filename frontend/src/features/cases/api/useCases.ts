import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usePrefetchPage } from '@/shared/api/usePrefetchPage'
import { getCases } from './cases.api'
import { casesKeys } from './cases.keys'
import type { CaseListParams } from '../types/case'

export function useCases(params: CaseListParams = {}) {
    return useQuery({
        queryKey: casesKeys.list(params),
        queryFn: () => getCases(params),
        placeholderData: keepPreviousData,
    })
}

/** Pide de antemano otra página del listado, con los mismos filtros (`usePrefetchPage`). */
export function usePrefetchCasesPage(params: CaseListParams) {
    return usePrefetchPage((page) => ({
        queryKey: casesKeys.list({ ...params, page }),
        queryFn: () => getCases({ ...params, page }),
    }))
}
