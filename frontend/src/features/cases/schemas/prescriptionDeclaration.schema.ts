/**
 * Validación del modal "Marcar la causa como prescripta" (HU33). El backend
 * las vuelve a verificar: los límites y los mensajes son los del cuerpo de
 * `POST /cases/{caseId}/prescription` (V4 §3.7).
 */

import { todayIsoDate } from '@/shared/lib/dates'
import type { PrescriptionDeclarationFormValues } from '@/features/cases/types/prescriptionDeclaration'

export type PrescriptionDeclarationFormErrors = Partial<Record<keyof PrescriptionDeclarationFormValues, string>>

const RESOLUTION_MAX = 255
const GROUNDS_MAX = 2000

/**
 * Topes de los controles (`maxLength`), por campo del formulario: no dejan
 * escribir de más. Salen de las mismas constantes que valida el schema.
 */
export const PRESCRIPTION_DECLARATION_MAX_LENGTH = { resolution: RESOLUTION_MAX, grounds: GROUNDS_MAX } as const

export function validatePrescriptionDeclaration(
    values: PrescriptionDeclarationFormValues,
): PrescriptionDeclarationFormErrors {
    const errors: PrescriptionDeclarationFormErrors = {}

    // Las fechas `YYYY-MM-DD` se comparan como texto: no hay que armar un Date.
    if (!values.prescriptionDate) {
        errors.prescriptionDate = 'La fecha de la prescripción es obligatoria.'
    } else if (values.prescriptionDate > todayIsoDate()) {
        errors.prescriptionDate = 'No puede ser posterior a hoy.'
    }

    const resolution = values.resolution.trim()
    if (!resolution) {
        errors.resolution = 'La resolución que declara la prescripción es obligatoria.'
    } else if (resolution.length > RESOLUTION_MAX) {
        errors.resolution = `Puede tener hasta ${RESOLUTION_MAX} caracteres.`
    }

    if (values.grounds.trim().length > GROUNDS_MAX) {
        errors.grounds = `Puede tener hasta ${GROUNDS_MAX} caracteres.`
    }

    return errors
}
