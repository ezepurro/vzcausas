/** `GET /users` — listado paginado y filtrable. */

import { keepPreviousData, useQuery } from '@tanstack/react-query'

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
