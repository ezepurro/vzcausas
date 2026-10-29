/**
 * Validación de "Generar expediente" (HU25). El backend la vuelve a hacer:
 * los límites son los del cuerpo de `POST /cases/{caseId}/case-files`
 * (V5 §3.12).
 */

import type { CaseFileFormValues } from '@/features/cases/types/caseFile'

/** Los dos textos y, aparte, la lista de documentos elegidos. */
export type CaseFileFormErrors = Partial<Record<keyof CaseFileFormValues | 'documentIds', string>>

/** El tope de `cover.opposingParty` y de `cover.notes`. */
export const COVER_TEXT_MAX = 500

export const NO_DOCUMENTS_MESSAGE = 'Elegí al menos un documento.'

export function validateCaseFile(values: CaseFileFormValues, documentIds: readonly string[]): CaseFileFormErrors {
    const errors: CaseFileFormErrors = {}

    if (documentIds.length === 0) errors.documentIds = NO_DOCUMENTS_MESSAGE

    // Los dos son opcionales: sólo se controla el largo.
    if (values.opposingParty.trim().length > COVER_TEXT_MAX) {
        errors.opposingParty = `Puede tener hasta ${COVER_TEXT_MAX} caracteres.`
    }
    if (values.notes.trim().length > COVER_TEXT_MAX) {
        errors.notes = `Puede tener hasta ${COVER_TEXT_MAX} caracteres.`
    }

    return errors
}
