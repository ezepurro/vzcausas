/**
 * El expediente de la causa (HU25, V5 §3.12) y la carátula que lo encabeza
 * (HU24, V5 §3.7). Los dos los arma el backend en PDF; nada de la carátula se
 * guarda en la causa (D-92).
 *
 * El expediente generado es un documento más de la carpeta: llega con la
 * forma de `CaseDocument` y `caseFile` con su `id` y su `version`.
 */

import type { CaseDocument } from '@/features/cases/types/caseDocument'

/** `inline` para verlo e imprimirlo; `attachment` para guardarlo. */
export type FileDisposition = 'inline' | 'attachment'

/**
 * Lo que la hoja de carátula necesita y la causa no tiene. Se pide en cada
 * expediente: no se guarda.
 */
export interface CaseFileCover {
    /** Sólo en `CRIMINAL`: el querellante si el cliente es defensa, el imputado si es querellante. */
    opposingParty?: string
    /** El recuadro "Observaciones". */
    notes?: string
}

/** El cuerpo de `POST /cases/{caseId}/case-files`. */
export interface CreateCaseFileBody {
    /** Sólo si se completó algo. */
    cover?: CaseFileCover
    /** Al menos uno, sin repetir y sin expedientes. El orden de la lista es el del expediente. */
    documentIds: string[]
}

export type CaseFilePartKind = 'COVER' | 'DOCUMENT'

/** Una parte del expediente, en su orden. */
export interface CaseFilePart {
    /** Desde 1; la carátula es siempre la 1. */
    position: number
    kind: CaseFilePartKind
    /** `null` en la carátula. */
    documentId: string | null
    name: string
}

/** La respuesta de `POST /cases/{caseId}/case-files`. */
export interface GeneratedCaseFile {
    /** El PDF guardado en la carpeta, con `caseFile` en `{ id, version }`. */
    document: CaseDocument
    version: number
    pageCount: number
    parts: CaseFilePart[]
    generatedBy: { id: number; lastName: string; firstName: string }
    /** Instante ISO 8601. */
    generatedAt: string
}

/** Los dos textos de la pantalla "Generar expediente". */
export interface CaseFileFormValues {
    opposingParty: string
    notes: string
}
