/**
 * Cómo se muestra cada documento en la tarjeta "Documentación" (HU38), como el
 * prototipo: el tipo en un recuadro ("PDF", "DOC", "IMG") y el peso.
 */

import type { CaseDocument } from '@/features/cases/types/caseDocument'

/** El tipo que muestra el prototipo para cada extensión. */
const TYPE_BY_EXTENSION: Record<string, string> = {
    pdf: 'PDF',
    doc: 'DOC',
    docx: 'DOC',
    jpg: 'IMG',
    jpeg: 'IMG',
    png: 'IMG',
}

/** Un documento de Google no tiene extensión (V5 §3.12): se reconoce por su tipo. */
const GOOGLE_DOCUMENT = 'application/vnd.google-apps.document'

/** Lo que muestra el prototipo para un tipo que no reconoce. */
const OTHER = 'ARCH'

/**
 * `PDF`, `DOC`, `IMG` o `ARCH`. Sale de la extensión y, si no hay, del
 * `mimeType`, como pide el contrato.
 */
export function documentTypeLabel(doc: Pick<CaseDocument, 'extension' | 'mimeType'>): string {
    if (doc.extension) return TYPE_BY_EXTENSION[doc.extension] ?? OTHER
    return doc.mimeType === GOOGLE_DOCUMENT ? 'DOC' : OTHER
}

const DECIMAL = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

/**
 * El peso como lo lee una persona: `512 B`, `88 KB`, `1,3 MB`. `null` si Drive
 * no lo mide (los documentos nativos de Google): el renglón no lo muestra.
 */
export function formatFileSize(bytes: number | null): string | null {
    if (bytes === null) return null
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${DECIMAL.format(bytes / (1024 * 1024))} MB`
}