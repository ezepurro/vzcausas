import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDocumentTemplate } from '@/features/documents/api/documentTemplates.api'
import { documentTemplateKeys } from '@/features/documents/api/documentTemplates.keys'

export function useCreateDocumentTemplate() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (body: FormData) => createDocumentTemplate(body),
        onSuccess: () => {
            // Un alta cambia la vista general y la de cada uno de sus fueros.
            queryClient.invalidateQueries({ queryKey: documentTemplateKeys.lists() })
        },
    })
}
