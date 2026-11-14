/**
 * Validación del diálogo "Anular acto procesal" (HU29). El backend la vuelve
 * a verificar: el límite es el del cuerpo de
 * `DELETE /cases/{caseId}/procedural-acts/{actId}` (V6 §3.8).
 */

import type { AnnulProceduralActFormValues } from '@/features/cases/types/proceduralActAnnulment'

export type AnnulProceduralActFormErrors = Partial<Record<keyof AnnulProceduralActFormValues, string>>

const REASON_MAX = 500

/**
 * Topes de los controles (`maxLength`), por campo del formulario: no dejan
 * escribir de más. Salen de las mismas constantes que valida el schema.
 */
export const PROCEDURAL_ACT_ANNULMENT_MAX_LENGTH = { reason: REASON_MAX } as const

export function validateAnnulProceduralAct(values: AnnulProceduralActFormValues): AnnulProceduralActFormErrors {
    const errors: AnnulProceduralActFormErrors = {}

    // El motivo es opcional (CA-29.1): sólo se controla el largo (CA-29.10).
    if (values.reason.trim().length > REASON_MAX) {
        errors.reason = `Puede tener hasta ${REASON_MAX} caracteres.`
    }

    return errors
}
