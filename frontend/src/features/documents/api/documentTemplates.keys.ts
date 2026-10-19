import type { DocumentTemplateListParams } from '@/features/documents/types/documentTemplate'

export const documentTemplateKeys = {
    /** Todo lo de modelos formales */
    all: ['document-templates'] as const,

    /** Todos los listados, sin importar fuero ni página. */
    lists: () => [...documentTemplateKeys.all, 'list'] as const,

    /** Un listado concreto. Los parámetros van adentro de la clave. */
    list: (params: DocumentTemplateListParams) => [...documentTemplateKeys.lists(), params] as const,
}
