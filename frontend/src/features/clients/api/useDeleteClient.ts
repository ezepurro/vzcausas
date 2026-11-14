/** `DELETE /clients/{clientId}` (HU11). */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { removeFromLists, restoreLists } from '@/shared/api/optimisticRemoval'
import { deleteClient } from '@/features/clients/api/clients.api'
import { clientKeys } from '@/features/clients/api/clients.keys'
import type { DeleteClientBody } from '@/features/clients/types/clientDeletion'

/** `useMutation` pasa un solo argumento, así que los dos van en un objeto. */
interface DeleteClientVars {
    id: number
    /** Sin motivo no viaja cuerpo (`toDeleteClientBody`). */
    body?: DeleteClientBody
}

export function useDeleteClient() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, body }: DeleteClientVars) => deleteClient(id, body),
        /* La fila sale de la tabla al confirmar. Si el backend la rechaza
           (409 por causas activas, 404, un error del servidor) vuelve a
           aparecer: ver `optimisticRemoval`. */
        onMutate: ({ id }) => removeFromLists(queryClient, clientKeys.lists(), id),
        onError: (_error, _vars, snapshot) => restoreLists(queryClient, snapshot),
        onSuccess: (_data, { id }) => {
            /* Se REMUEVE, no se invalida: invalidar dispararía un GET del
               cliente recién dado de baja, que responde 404. */
            queryClient.removeQueries({ queryKey: clientKeys.detail(id) })
        },
        /* Con éxito o sin él, los listados se vuelven a pedir: la página se
           completa con el que sube de la siguiente, y el selector de
           "Registrar causa" deja de ofrecerlo (CA-11.3). */
        onSettled: () => queryClient.invalidateQueries({ queryKey: clientKeys.lists() }),
    })
}