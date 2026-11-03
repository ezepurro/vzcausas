import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usePrefetchNextPage } from '@/shared/api/usePrefetchNextPage'
import { listClients } from '@/features/clients/api/clients.api'
import { clientKeys } from '@/features/clients/api/clients.keys'
import type { ClientListParams } from '@/features/clients/types/client'

export function useClients(params: ClientListParams = {}, { prefetchNext = false } = {}) {
    const query = useQuery({
        queryKey: clientKeys.list(params),
        queryFn: () => listClients(params),
        /* Al cambiar de página o de filtro sigue mostrando el resultado
           anterior mientras llega el nuevo, en vez de vaciar la tabla. */
        placeholderData: keepPreviousData,
    })
    // Sólo las tablas lo piden; los desplegables no pasan de la primera página.
    usePrefetchNextPage(
        query.isPlaceholderData ? undefined : query.data?.pagination,
        (page) => ({ queryKey: clientKeys.list({ ...params, page }), queryFn: () => listClients({ ...params, page }) }),
        prefetchNext,
    )
    return query
}
