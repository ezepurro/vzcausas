/**
 * El vencimiento abierto de una causa, sea del origen que sea (V4 D-82).
 *
 * Desde V4 una causa puede tener abierto el plazo del acto procesal de su
 * estado actual (`currentState.dueDate`) o, en un amparo todavía en
 * "Iniciada", el plazo para presentarlo desde el acto lesivo
 * (`harmfulActDeadline`). Nunca los dos a la vez: el del acto lesivo sólo
 * existe en el estado inicial, que no abre plazo.
 *
 * El listado y el encabezado del detalle muestran el que haya. Los dos tienen
 * `dueDate` y `businessDaysRemaining`, así que van al mismo `deadlineStatus`.
 */

import type { Case, CurrentState } from '@/features/cases/types/case'

/** De dónde sale el vencimiento: los mismos códigos que `DeadlineKind` (V4 §2). */
export type DeadlineKind = 'PROCEDURAL_ACT' | 'HARMFUL_ACT'

export interface OpenDeadline extends Pick<CurrentState, 'dueDate' | 'businessDaysRemaining'> {
    kind: DeadlineKind
}

export function openDeadline(c: Pick<Case, 'currentState' | 'harmfulActDeadline'>): OpenDeadline {
    if (c.harmfulActDeadline) {
        return {
            kind: 'HARMFUL_ACT',
            dueDate: c.harmfulActDeadline.dueDate,
            businessDaysRemaining: c.harmfulActDeadline.businessDaysRemaining,
        }
    }
    return {
        kind: 'PROCEDURAL_ACT',
        dueDate: c.currentState.dueDate,
        businessDaysRemaining: c.currentState.businessDaysRemaining,
    }
}

/** El rótulo del origen, para la segunda línea: "Plazo para el amparo" (V4 §2, `DeadlineKind`). */
export const DEADLINE_KIND_LABELS: Record<DeadlineKind, string> = {
    PROCEDURAL_ACT: 'Plazo de presentación',
    HARMFUL_ACT: 'Plazo para el amparo',
}
