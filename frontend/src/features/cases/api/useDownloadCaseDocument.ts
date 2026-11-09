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
    /**
     * Con qué nombre se guarda; sin él, el del documento. La tarjeta
     * "Documentación" pasa `documentDownloadName`, porque un documento de
     * Google llega como PDF. El expediente ya es un PDF y no lo necesita.
     */
    fileName?: string
}

/**
 * "Descargar" de la tarjeta "Documentación" (HU38, CA-38.7) y "Descargar" e
 * "Imprimir" del diálogo "Expediente generado" (HU25, CA-25.10).
 *
 * Es un GET, pero va como mutación por lo mismo que la descarga de modelos:
 * lo dispara un click, no se cachea, y `variables` dice qué botón está
 * ocupado: cuál de los dos del diálogo, o de qué fila de la tarjeta.
 */
export function useDownloadCaseDocument(caseId: number) {
    return useMutation({
        mutationFn: async ({ document, disposition, fileName }: DownloadCaseDocumentVariables) => {
            const file = await downloadCaseDocumentFile(caseId, document.id, disposition)
            if (disposition === 'attachment') saveFile(file, fileName ?? document.name)
            else printFile(file)
        },
    })
}
