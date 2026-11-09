import { Button, Modal } from '@/shared/components/ui'
import type { FileDisposition, GeneratedCaseFile } from '@/features/cases/types/caseFile'
import { generatedCaseFileMeta } from '@/features/cases/utils/caseFile'

export interface CaseFileReadyModalProps {
    result: GeneratedCaseFile
    /** Qué botón está esperando la descarga, o `null`. */
    busy: FileDisposition | null
    downloaded: boolean
    printed: boolean
    onDownload: () => void
    onPrint: () => void
    onKeepEditing: () => void
    onBackToCase: () => void
}

/**
 * El diálogo "Expediente generado" (HU25). "Descargar" e "Imprimir" lo bajan
 * por la API, que lo permite a cualquier perfil (CA-25.10, D-103).
 */
export function CaseFileReadyModal({
    result,
    busy,
    downloaded,
    printed,
    onDownload,
    onPrint,
    onKeepEditing,
    onBackToCase,
}: CaseFileReadyModalProps) {
    return (
        <Modal
            title="Expediente generado"
            width="sm"
            onClose={onKeepEditing}
            footer={
                <>
                    <Button variant="ghost" className="vz-casefile__keep" onClick={onKeepEditing}>
                        Seguir editando
                    </Button>
                    <Button onClick={onBackToCase}>Volver a la causa</Button>
                </>
            }
        >
            <div className="vz-casefile__item vz-casefile__item--result">
                <span className="vz-casefile__type vz-casefile__type--pdf" aria-hidden="true">PDF</span>
                <div className="vz-casefile__main">
                    <div className="vz-casefile__name vz-casefile__name--mono" title={result.document.name}>
                        {result.document.name}
                    </div>
                    <div className="vz-casefile__meta">{generatedCaseFileMeta(result)}</div>
                </div>
            </div>
            <p className="vz-casefile__ready-text">
                Quedó guardado como nueva versión en la documentación de la causa y en su carpeta de Drive. Las
                versiones anteriores se conservan. Podés descargarlo e imprimirlo desde acá.
            </p>
            <div className="vz-casefile__ready-actions">
                <Button variant="secondary" block disabled={busy !== null} onClick={onDownload}>
                    {busy === 'attachment' ? 'Descargando…' : downloaded ? '✓ Descargado' : 'Descargar'}
                </Button>
                <Button variant="secondary" block disabled={busy !== null} onClick={onPrint}>
                    {busy === 'inline' ? 'Preparando…' : printed ? '✓ Enviado a imprimir' : 'Imprimir'}
                </Button>
            </div>
        </Modal>
    )
}
