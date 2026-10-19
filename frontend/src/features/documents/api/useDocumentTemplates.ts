import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listDocumentTemplates } from '@/features/documents/api/documentTemplates.api'
import { documentTemplateKeys } from '@/features/documents/api/documentTemplates.keys'
import type { DocumentTemplateListParams } from '@/features/documents/types/documentTemplate'

export interface UseDocumentTemplatesOptions {
    /**
     * `false` para no pedir nada: la Secretaría no consulta modelos y el
     * backend le respondería `403` (V4 §3.10). Por defecto, `true`.
     */
    enabled?: boolean
}

export function useDocumentTemplates(
    params: DocumentTemplateListParams = {},
    { enabled = true }: UseDocumentTemplatesOptions = {},
) {
    return useQuery({
        queryKey: documentTemplateKeys.list(params),
        queryFn: () => listDocumentTemplates(params),
        placeholderData: keepPreviousData,
        enabled,
    })
}
