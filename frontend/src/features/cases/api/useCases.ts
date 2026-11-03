import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usePrefetchNextPage } from '@/shared/api/usePrefetchNextPage'
import { getCases } from './cases.api'
import { casesKeys } from './cases.keys'
import type { CaseListParams } from '../types/case'

export function useCases(params: CaseListParams = {}, { prefetchNext = false } = {}) {
    const query = useQuery({
        queryKey: casesKeys.list(params),
        queryFn: () => getCases(params),
        placeholderData: keepPreviousData,
    })
    // Sólo las tablas lo piden; los desplegables no pasan de la primera página.
    usePrefetchNextPage(
        query.isPlaceholderData ? undefined : query.data?.pagination,
        (page) => ({ queryKey: casesKeys.list({ ...params, page }), queryFn: () => getCases({ ...params, page }) }),
        prefetchNext,
    )
    return query
}
