/** `PATCH /clients/{clientId}` (HU10). */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateClient } from '@/features/clients/api/clients.api'
import { clientKeys } from '@/features/clients/api/clients.keys'
import type { UpdateClientBody } from '@/features/clients/types/client'

/** `useMutation` pasa un solo argumento, así que los dos van en un objeto. */
interface UpdateClientVars {
    id: number
    body: UpdateClientBody
}

export function useUpdateClient() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, body }: UpdateClientVars) => updateClient(id, body),
        onSuccess: (updated) => {
            queryClient.setQueryData(clientKeys.detail(updated.id), updated)

            /* El cliente no se copia en sus causas: lo referencian (CA-10.2),
               y el detalle de la causa lo muestra en su tarjeta. Si cambió el
               nombre, además, el backend cambió la carátula de sus causas
               (CA-10.9). Las claves de causas son de un módulo que depende de
               éste, así que no se pueden nombrar desde acá: se marca vieja
               toda la caché, como en "Modificar abogado". Sólo se vuelve a
               pedir lo que está en pantalla; lo demás, cuando se abra. */
            queryClient.invalidateQueries()
        },
    })
}