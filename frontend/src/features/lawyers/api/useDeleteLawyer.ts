/** `DELETE /lawyers/{lawyerId}` con el reparto de sus causas activas (HU15, V6 §3.3). */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { isApiError } from '@/shared/api/ApiError'
import { removeFromLists, restoreLists } from '@/shared/api/optimisticRemoval'
import { deleteLawyer } from '@/features/lawyers/api/lawyers.api'
import { lawyerKeys } from '@/features/lawyers/api/lawyers.keys'
import type { DeleteLawyerBody } from '@/features/lawyers/types/lawyerDeletion'

/** `useMutation` pasa un solo argumento, así que los dos van en un objeto. */
interface DeleteLawyerVars {
    id: number
    body?: DeleteLawyerBody
}

export function useDeleteLawyer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, body }: DeleteLawyerVars) => deleteLawyer(id, body),
        /* La fila sale de la tabla al confirmar; si el backend la rechaza
           vuelve a aparecer (`optimisticRemoval`). */
        onMutate: ({ id }) => removeFromLists(queryClient, lawyerKeys.lists(), id),
        onError: (error, { id }, snapshot) => {
            restoreLists(queryClient, snapshot)
            /* Quedó una causa activa sin repartir (se le asignó una mientras
               el formulario estaba abierto): se vuelven a pedir sus causas y
               el formulario rearma el reparto (CA-15.10, V6 L1918). */
            if (isApiError(error) && error.is('LAWYER_HAS_DEPENDENCIES')) {
                void queryClient.invalidateQueries({ queryKey: lawyerKeys.cases(id) })
            }
        },
        onSuccess: (_data, { id }) => {
            /* Se REMUEVE, no se invalida: un GET del abogado dado de baja
               responde 404. Se lleva sus causas y su usuario vinculado, que
               cuelgan del detalle. */
            queryClient.removeQueries({ queryKey: lawyerKeys.detail(id) })

            /* Cambian cosas de otros módulos que dependen de éste y no se
               pueden nombrar desde acá: el responsable de las causas
               reasignadas, la carga de los abogados de destino, el usuario
               vinculado (pierde el perfil o se da de baja) y los tableros
               (CA-15.8, CA-15.12). Se marca vieja toda la caché, como al
               cambiar el nombre (`useUpdateLawyer`). */
            queryClient.invalidateQueries()
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: lawyerKeys.lists() }),
    })
}
