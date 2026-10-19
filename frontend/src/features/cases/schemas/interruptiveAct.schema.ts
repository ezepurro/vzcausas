/**
 * Validación del modal "Registrar acto interruptivo" (HU31). El backend las
 * vuelve a verificar: los límites y los mensajes son los del cuerpo de
 * `POST /cases/{caseId}/interruptive-acts` (V4 §3.9).
 */

import { todayIsoDate } from '@/shared/lib/dates'
import type { InterruptiveActFormValues } from '@/features/cases/types/interruptiveAct'

export type InterruptiveActFormErrors = Partial<Record<keyof InterruptiveActFormValues, string>>

const NAME_MAX = 255
const NOTES_MAX = 2000

export function validateInterruptiveAct(values: InterruptiveActFormValues): InterruptiveActFormErrors {
    const errors: InterruptiveActFormErrors = {}

    const name = values.name.trim()
    if (!name) {
        errors.name = 'El acto interruptivo es obligatorio.'
    } else if (name.length > NAME_MAX) {
        errors.name = `Puede tener hasta ${NAME_MAX} caracteres.`
    }

    // Las fechas `YYYY-MM-DD` se comparan como texto: no hay que armar un Date.
    if (!values.actDate) {
        errors.actDate = 'La fecha del acto es obligatoria.'
    } else if (values.actDate > todayIsoDate()) {
        errors.actDate = 'No puede ser posterior a hoy.'
    }

    if (values.notes.trim().length > NOTES_MAX) {
        errors.notes = `Puede tener hasta ${NOTES_MAX} caracteres.`
    }

    return errors
}
