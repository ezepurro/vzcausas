/** `DELETE /document-templates/{templateId}` (HU37). */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { removeFromLists, restoreLists } from '@/shared/api/optimisticRemoval'
import { deleteDocumentTemplate } from '@/features/documents/api/documentTemplates.api'
import { documentTemplateKeys } from '@/features/documents/api/documentTemplates.keys'

export function useDeleteDocumentTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => deleteDocumentTemplate(id),
        /* La tarjeta sale de la lista al confirmar. Si el backend la rechaza
           (404, un error del servidor) vuelve a aparecer: ver `optimisticRemoval`. */
        onMutate: (id) => removeFromLists(queryClient, documentTemplateKeys.lists(), id),
        onError: (_error, _id, snapshot) => restoreLists(queryClient, snapshot),
        /* Con éxito o sin él, los listados se vuelven a pedir: los contadores
           de cada fuero los calcula el backend, y el alta de causa deja de
           contarlo entre los que se copian (CA-37.3). */
        onSettled: () => queryClient.invalidateQueries({ queryKey: documentTemplateKeys.lists() }),
    })
}