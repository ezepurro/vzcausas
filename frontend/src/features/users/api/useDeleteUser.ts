import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteUser } from '@/features/users/api/users.api'
import { userKeys } from '@/features/users/api/users.keys'

export function useDeleteUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => deleteUser(id),
        onSuccess: (_data, id) => {
            /* Se REMUEVE, no se invalida: invalidar dispararía un GET del
               usuario recién borrado, que responde 404. */
            queryClient.removeQueries({ queryKey: userKeys.detail(id) })

            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
        },
    })
}