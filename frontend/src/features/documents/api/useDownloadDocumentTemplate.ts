import { useMutation } from '@tanstack/react-query'
import { downloadDocumentTemplateFile } from '@/features/documents/api/documentTemplates.api'
import type { DocumentTemplate } from '@/features/documents/types/documentTemplate'
import { saveFile } from '@/shared/lib/saveFile'

/**
 * "Descargar" (CA-35.6). Es un GET, pero va como mutación porque lo dispara
 * un click y no se cachea: cada descarga trae la última versión. Además da
 * `isPending` y `variables`, para marcar ocupada sólo la tarjeta que se bajó.
 */
export function useDownloadDocumentTemplate() {
    return useMutation({
        mutationFn: async (template: DocumentTemplate) => {
            const file = await downloadDocumentTemplateFile(template.id)
            saveFile(file, template.fileName)
        },
    })
}
