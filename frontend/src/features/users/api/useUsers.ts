/** `GET /users` — listado paginado y filtrable. */

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usePrefetchNextPage } from '@/shared/api/usePrefetchNextPage'

import { listUsers } from '@/features/users/api/users.api'
import { userKeys } from '@/features/users/api/users.keys'
import type { UserListParams } from '@/features/users/types/user'

export function useUsers(params: UserListParams = {}, { prefetchNext = false } = {}) {
    const query = useQuery({
        queryKey: userKeys.list(params),
        queryFn: () => listUsers(params),
        /* Al cambiar de página o de filtro sigue mostrando el resultado
           anterior mientras llega el nuevo, en vez de vaciar la tabla. */
        placeholderData: keepPreviousData,
    })
    // Sólo las tablas lo piden; los desplegables no pasan de la primera página.
    usePrefetchNextPage(
        query.isPlaceholderData ? undefined : query.data?.pagination,
        (page) => ({ queryKey: userKeys.list({ ...params, page }), queryFn: () => listUsers({ ...params, page }) }),
        prefetchNext,
    )
    return query
}
