/** `PATCH /lawyers/{lawyerId}` (HU14). */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateLawyer } from '@/features/lawyers/api/lawyers.api'
import { lawyerKeys } from '@/features/lawyers/api/lawyers.keys'
import type { UpdateLawyerBody } from '@/features/lawyers/types/lawyer'

/** `useMutation` pasa un solo argumento, así que los dos van en un objeto. */
interface UpdateLawyerVars {
    id: number
    body: UpdateLawyerBody
}

export function useUpdateLawyer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, body }: UpdateLawyerVars) => updateLawyer(id, body),
        onSuccess: (updated, { body }) => {
            queryClient.setQueryData(lawyerKeys.detail(updated.id), updated)
            queryClient.invalidateQueries({ queryKey: lawyerKeys.lists() })

            /* El nombre del abogado no se copia: lo referencian las causas
               (`responsibleLawyer`), los usuarios vinculados, los tableros y
               la sesión (CA-14.2). Sus claves son de módulos que dependen de
               éste, así que no se pueden nombrar desde acá: se marca vieja
               toda la caché. Sólo se vuelve a pedir lo que está en pantalla;
               lo demás, cuando se abra. */
            if (body.lastName !== undefined || body.firstName !== undefined) {
                queryClient.invalidateQueries()
            }
        },
    })
}
