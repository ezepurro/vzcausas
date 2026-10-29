import { useMutation } from '@tanstack/react-query'
import type { CaseDocument } from '@/features/cases/types/caseDocument'
import type { FileDisposition } from '@/features/cases/types/caseFile'
import { printFile } from '@/shared/lib/printFile'
import { saveFile } from '@/shared/lib/saveFile'
import { downloadCaseDocumentFile } from './cases.api'

export interface DownloadCaseDocumentVariables {
    document: Pick<CaseDocument, 'id' | 'name'>
    /** `attachment` lo guarda ("Descargar"); `inline` abre la impresión ("Imprimir"). */
    disposition: FileDisposition
}

/**
 * "Descargar" e "Imprimir" del diálogo "Expediente generado" (HU25, CA-25.10).
 *
 * Es un GET, pero va como mutación por lo mismo que la descarga de modelos:
 * lo dispara un click, no se cachea, y `variables` dice cuál de los dos
 * botones está ocupado.
 */
export function useDownloadCaseDocument(caseId: number) {
    return useMutation({
        mutationFn: async ({ document, disposition }: DownloadCaseDocumentVariables) => {
            const file = await downloadCaseDocumentFile(caseId, document.id, disposition)
            if (disposition === 'attachment') saveFile(file, document.name)
            else printFile(file)
        },
    })
}
