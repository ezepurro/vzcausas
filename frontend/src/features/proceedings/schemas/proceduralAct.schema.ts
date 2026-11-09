/**
 * Validación del registro de un acto procesal.
 * El backend las vuelve a verificar: validar acá es para no gastar un viaje al
 * servidor y para decir qué campo está mal, no para reemplazarlo.
 *
 * Las restricciones son las del cuerpo de `POST /cases/{caseId}/procedural-acts`
 * (V3 §3.8). Las fechas son `YYYY-MM-DD`, así que se comparan como texto.
 */

import { todayIsoDate } from '@/shared/lib/dates'
import type { Jurisdiction } from '@/features/legal-params'
import type { ProceduralActFormValues } from '@/features/proceedings/types/proceduralAct'

export type ProceduralActErrors = Partial<Record<keyof ProceduralActFormValues, string>>

export interface ProceduralActValidationContext {
    /** El fuero de la causa: en el administrativo el plazo corre desde la notificación (RN6). */
    jurisdiction: Jurisdiction
    /**
     * Si el estado elegido de la tabla abre plazo. `false` para un estado
     * escrito a mano, que nunca abre plazo de tabla.
     */
    opensTerm: boolean
}

const STATE_MAX = 255
const NOTES_MAX = 2000

/**
 * Topes de los controles (`maxLength`), por campo del formulario: no dejan
 * escribir de más. Salen de las mismas constantes que valida el schema.
 */
export const PROCEDURAL_ACT_MAX_LENGTH = { stateText: STATE_MAX, notes: NOTES_MAX } as const

export function validateProceduralAct(
    values: ProceduralActFormValues,
    ctx: ProceduralActValidationContext,
): ProceduralActErrors {
    const errors: ProceduralActErrors = {}
    const today = todayIsoDate()
    const administrative = ctx.jurisdiction === 'ADMINISTRATIVE'

    const state = values.stateText.trim()
    if (!state) {
        errors.stateText = 'Elegí de la lista o escribí el estado al que pasa la causa.'
    } else if (state.length > STATE_MAX) {
        errors.stateText = `Puede tener hasta ${STATE_MAX} caracteres.`
    }

    if (!values.actDate) {
        errors.actDate = 'La fecha del acto es obligatoria.'
    } else if (values.actDate > today) {
        errors.actDate = 'La fecha del acto no puede ser posterior a hoy.'
    }

    if (administrative) {
        if (!values.notificationDate) {
            // Sin notificación no hay vencimiento que calcular, y el acto no
            // existe sin él (V3 D-12).
            if (ctx.opensTerm) {
                errors.notificationDate =
                    'En el fuero administrativo el plazo corre desde la notificación: cargá su fecha.'
            }
        } else if (values.notificationDate > today) {
            errors.notificationDate = 'La fecha de notificación no puede ser posterior a hoy.'
        } else if (values.actDate && values.notificationDate < values.actDate) {
            errors.notificationDate = 'La notificación no puede ser anterior al acto.'
        }
    }

    if (values.manualDue) {
        const countsFrom = administrative ? values.notificationDate : values.actDate
        if (!values.manualDueDate) {
            errors.manualDueDate = 'Cargá la fecha de vencimiento o destildá el ajuste manual.'
        } else if (countsFrom && values.manualDueDate < countsFrom) {
            errors.manualDueDate = administrative
                ? 'El vencimiento no puede ser anterior a la notificación.'
                : 'El vencimiento no puede ser anterior al acto.'
        }
    }

    if (values.notes.trim().length > NOTES_MAX) {
        errors.notes = `Puede tener hasta ${NOTES_MAX} caracteres.`
    }

    return errors
}

/** `true` si no hay ningún error. Evita repetir el `Object.keys` en la pantalla. */
export function isValid(errors: ProceduralActErrors): boolean {
    return Object.keys(errors).length === 0
}
