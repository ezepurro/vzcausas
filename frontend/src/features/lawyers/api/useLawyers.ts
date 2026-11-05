/** `GET /lawyers` — listado paginado y filtrable. */

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usePrefetchPage } from '@/shared/api/usePrefetchPage'

import { listLawyers } from '@/features/lawyers/api/lawyers.api'
import { lawyerKeys } from '@/features/lawyers/api/lawyers.keys'
import type { LawyerListParams } from '@/features/lawyers/types/lawyer'

export function useLawyers(params: LawyerListParams = {}) {
    return useQuery({
        queryKey: lawyerKeys.list(params),
        queryFn: () => listLawyers(params),
        /* Al cambiar de página o de filtro sigue mostrando el resultado
           anterior mientras llega el nuevo, en vez de vaciar la tabla. */
        placeholderData: keepPreviousData,
    })
}

/** Pide de antemano otra página del listado, con la misma búsqueda (`usePrefetchPage`). */
export function usePrefetchLawyersPage(params: LawyerListParams) {
    return usePrefetchPage((page) => ({
        queryKey: lawyerKeys.list({ ...params, page }),
        queryFn: () => listLawyers({ ...params, page }),
    }))
}
