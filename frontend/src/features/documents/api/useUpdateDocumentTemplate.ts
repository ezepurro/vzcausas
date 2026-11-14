/** `PATCH /document-templates/{templateId}` (HU36). */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateDocumentTemplate } from '@/features/documents/api/documentTemplates.api'
import { documentTemplateKeys } from '@/features/documents/api/documentTemplates.keys'

/** `useMutation` pasa un solo argumento, así que los dos van en un objeto. */
interface UpdateDocumentTemplateVars {
    id: number
    /** El `multipart/form-data` que arma `toUpdateDocumentTemplateBody`. */
    body: FormData
}

export function useUpdateDocumentTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, body }: UpdateDocumentTemplateVars) => updateDocumentTemplate(id, body),
        onSuccess: () => {
            /* Todos los listados: la vista general cuenta los modelos de cada
               fuero, la de cada fuero los lista, y el alta de causa cuenta los
               que se copian a una causa nueva (CA-36.7). Un cambio de fueros o
               de "Copiar en las causas nuevas" mueve el modelo entre ellos. */
            queryClient.invalidateQueries({ queryKey: documentTemplateKeys.lists() })
        },
    })
}