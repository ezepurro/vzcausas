/**
 * Los documentos de la causa (HU38, V5 §3.12). Se leen de la carpeta de la
 * causa en Drive en cada pedido (D-100): no se guardan en la base.
 *
 * El `id` es el de Drive y es opaco. El autor (`uploadedBy`) es una cuenta de
 * Google, no un usuario del sistema (D-101).
 */

import type { CaseFolderStatus } from '@/features/cases/types/case'

/** Un expediente generado por el sistema (HU25). */
export interface CaseFileRef {
    id: number
    version: number
}

/** Un archivo de la carpeta de la causa. */
export interface CaseDocument {
    /** El id del archivo en Drive. El cliente no lo interpreta. */
    id: string
    /** Con su extensión: `Cédula de notificación.pdf`. */
    name: string
    /** En minúsculas y sin punto. `null` si no tiene, o si es un documento nativo de Google. */
    extension: string | null
    mimeType: string
    /** `null` en los documentos nativos de Google, que Drive no mide. */
    sizeBytes: number | null
    /** Instante ISO 8601 en que se subió o creó en Drive. */
    createdAt: string
    modifiedAt: string
    /** Quien lo subió, según Drive. `null` si Drive no lo informa. */
    uploadedBy: string | null
    /** Para abrirlo en Drive ("Abrir"). */
    url: string
    /** Si puede formar parte del expediente (HU25). */
    convertibleToPdf: boolean
    /** Si es un expediente generado por el sistema; `null` en los demás. */
    caseFile: CaseFileRef | null
}

/**
 * La respuesta de `GET /cases/{caseId}/documents`. Es un objeto y no una
 * lista: trae además la situación de la carpeta y cuándo se leyó.
 */
export interface CaseDocumentList {
    /** El `folder.status` de la causa; `null` si la causa no tiene carpeta. */
    folderStatus: CaseFolderStatus | null
    folderUrl: string | null
    /** Cuándo se leyó la carpeta. `null` si no se leyó porque no está creada. */
    readAt: string | null
    /** Del más reciente al más antiguo, sin paginar. Vacío sin carpeta creada. */
    documents: CaseDocument[]
}