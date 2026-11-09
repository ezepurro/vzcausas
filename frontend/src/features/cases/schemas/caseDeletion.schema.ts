/**
 * Validación del diálogo "Dar de baja la causa" (HU21). El backend la vuelve a
 * verificar: el límite es el del cuerpo de `DELETE /cases/{caseId}` (V5 §3.7).
 */

import type { DeleteCaseFormValues } from '@/features/cases/types/caseDeletion'

export type DeleteCaseFormErrors = Partial<Record<keyof DeleteCaseFormValues, string>>

const REASON_MAX = 500

/**
 * Topes de los controles (`maxLength`), por campo del formulario: no dejan
 * escribir de más. Salen de las mismas constantes que valida el schema.
 */
export const CASE_DELETION_MAX_LENGTH = { reason: REASON_MAX } as const

export function validateDeleteCase(values: DeleteCaseFormValues): DeleteCaseFormErrors {
    const errors: DeleteCaseFormErrors = {}

    // El motivo es opcional (CA-21.2): sólo se controla el largo.
    if (values.reason.trim().length > REASON_MAX) {
        errors.reason = `Puede tener hasta ${REASON_MAX} caracteres.`
    }

    return errors
}