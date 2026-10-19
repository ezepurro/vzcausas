/**
 * Acto procesal tal como lo devuelve el contrato (V4 §3.8).
 *
 * El dueño de la pantalla de registro es `proceedings`, pero la forma vive acá
 * porque la línea de vida de la causa (HU27) la trae embebida y las
 * dependencias van `proceedings → cases`. `proceedings` la reexporta, igual
 * que `ResultingState`.
 */

import type { DayType } from '@/features/legal-params'
import type { ResultingState } from '@/features/cases/types/case'

/** El plazo que abre el acto. Los valores de la tabla se copian al registrarlo. */
export interface ActDeadline {
    timeLimitDays: number
    dayType: DayType
    /** `notificationDate` en el fuero administrativo, `actDate` en los demás. */
    countsFrom: string
    /** Lo que da la tabla. `null` si el estado no abre plazo. */
    computedDueDate: string | null
    /** El vigente: el calculado o, si se ajustó, el manual. */
    dueDate: string
    manuallyAdjusted: boolean
}

/** El recurso tal como viene adentro de `data`. */
export interface ProceduralAct {
    id: number
    caseId: number
    resultingState: ResultingState
    actDate: string
    /** Sólo en el fuero administrativo (RN6). */
    notificationDate: string | null
    notes: string | null
    /** `null` si el acto no abre plazo. */
    deadline: ActDeadline | null
    /** Apellido y nombres separados desde V4 (D-68). */
    registeredBy: { id: number; lastName: string; firstName: string }
    /** Fecha y hora del registro, ISO 8601. */
    registeredAt: string
}
