import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listClients } from '@/features/clients/api/clients.api'
import { clientKeys } from '@/features/clients/api/clients.keys'
import type { ClientListParams } from '@/features/clients/types/client'

export function useClients(params: ClientListParams = {}) {
    return useQuery({
        queryKey: clientKeys.list(params),
        queryFn: () => listClients(params),
        /* Al cambiar de página o de filtro sigue mostrando el resultado
           anterior mientras llega el nuevo, en vez de vaciar la tabla. */
        placeholderData: keepPreviousData,
    })
}