/**
 * Validación del diálogo "Eliminar cliente" (HU11). El backend la vuelve a
 * verificar: el límite es el del cuerpo de `DELETE /clients/{clientId}`
 * (V6 §3.6).
 */

import type { DeleteClientFormValues } from '@/features/clients/types/clientDeletion'

export type DeleteClientFormErrors = Partial<Record<keyof DeleteClientFormValues, string>>

const REASON_MAX = 500

/**
 * Topes de los controles (`maxLength`), por campo del formulario: no dejan
 * escribir de más. Salen de las mismas constantes que valida el schema.
 */
export const CLIENT_DELETION_MAX_LENGTH = { reason: REASON_MAX } as const

export function validateDeleteClient(values: DeleteClientFormValues): DeleteClientFormErrors {
    const errors: DeleteClientFormErrors = {}

    // El motivo es opcional (CA-11.7): sólo se controla el largo.
    if (values.reason.trim().length > REASON_MAX) {
        errors.reason = `Puede tener hasta ${REASON_MAX} caracteres.`
    }

    return errors
}