import { keepPreviousData, useQuery } from '@tanstack/react-query'
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