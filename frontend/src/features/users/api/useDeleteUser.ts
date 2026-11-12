import { useMutation, useQueryClient } from '@tanstack/react-query'

import { removeFromLists, restoreLists } from '@/shared/api/optimisticRemoval'
import { deleteUser } from '@/features/users/api/users.api'
import { userKeys } from '@/features/users/api/users.keys'

export function useDeleteUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => deleteUser(id),
        /* La fila sale de la tabla al confirmar. Si el backend la rechaza
           (409 por dependencias, 422 el administrador protegido) vuelve a
           aparecer: ver `optimisticRemoval`. */
        onMutate: (id) => removeFromLists(queryClient, userKeys.lists(), id),
        onError: (_error, _id, snapshot) => restoreLists(queryClient, snapshot),
        onSuccess: (_data, id) => {
            /* Se REMUEVE, no se invalida: invalidar dispararía un GET del
               usuario recién borrado, que responde 404. */
            queryClient.removeQueries({ queryKey: userKeys.detail(id) })
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
    })
}