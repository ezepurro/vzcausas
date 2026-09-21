/** `GET /lawyers` — listado paginado y filtrable. */

import { keepPreviousData, useQuery } from '@tanstack/react-query'

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
