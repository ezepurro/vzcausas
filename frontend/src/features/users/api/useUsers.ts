/** `GET /users` — listado paginado y filtrable. */

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usePrefetchPage } from '@/shared/api/usePrefetchPage'

import { listUsers } from '@/features/users/api/users.api'
import { userKeys } from '@/features/users/api/users.keys'
import type { UserListParams } from '@/features/users/types/user'

export function useUsers(params: UserListParams = {}) {
    return useQuery({
        queryKey: userKeys.list(params),
        queryFn: () => listUsers(params),
        /* Al cambiar de página o de filtro sigue mostrando el resultado
           anterior mientras llega el nuevo, en vez de vaciar la tabla. */
        placeholderData: keepPreviousData,
    })
}

/** Pide de antemano otra página del listado, con los mismos filtros (`usePrefetchPage`). */
export function usePrefetchUsersPage(params: UserListParams) {
    return usePrefetchPage((page) => ({
        queryKey: userKeys.list({ ...params, page }),
        queryFn: () => listUsers({ ...params, page }),
    }))
}
