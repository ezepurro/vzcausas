/**
 * Acto procesal: las formas sacadas del contrato (V3 §3.8).
 *
 * El acto es lo que **mueve la causa**: al registrarlo se elige el estado al
 * que pasa, y el plazo sale de la tabla del fuero (RN5). El primer acto es
 * además el que le da a la causa su primer estado (V3 D-09).
 *
 * Sólo el abogado responsable de la causa registra actos (V3 D-30), y el
 * acto se aplica a la causa en el momento: no hay actos pendientes ni
 * confirmación posterior (V3 D-13), así que el recurso no tiene un estado
 * propio.
 *
 * En este sprint sólo existe el registro (HU26) y su previsualización;
 * consultar, modificar y anular actos son de sprints posteriores.
 */

import type { CaseState } from '@/features/cases'
import type { DayType } from '@/features/legal-params'

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

/**
 * El estado al que pasó la causa con el acto. Es sólo una parte del
 * `currentState` de la causa: no trae el vencimiento, que va en `deadline`, y
 * nunca es el estado inicial "Iniciada" (V3 §3.8).
 */
export type ResultingState = Pick<CaseState, 'proceduralStateId' | 'name' | 'custom'>

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
    registeredBy: { id: number; fullName: string }
    /** Fecha y hora del registro, ISO 8601. */
    registeredAt: string
}

/**
 * Cuerpo del `POST /cases/{caseId}/procedural-acts`. `proceduralStateId` y
 * `customState` son excluyentes: va uno o el otro, nunca los dos.
 */
export interface CreateProceduralActBody {
    proceduralStateId?: number
    customState?: string
    actDate: string
    notificationDate?: string
    manualDueDate?: string
    notes?: string
}

/** Respuesta de `GET .../deadline-preview`. */
export interface DeadlinePreview {
    proceduralStateId: number
    timeLimitDays: number
    dayType: DayType
    countsFrom: string
    /** `null` si el estado no abre plazo. */
    dueDate: string | null
    /** `null` si el estado no abre plazo. */
    businessDaysRemaining: number | null
}

/** Parámetros de `GET .../deadline-preview`. */
export interface DeadlinePreviewParams {
    proceduralStateId: number
    actDate: string
    notificationDate?: string
}

/**
 * Los valores del formulario. Es un formulario de página, no un `FormModal`,
 * pero se mantiene todo en texto y booleanos, como devuelven los inputs.
 */
export type ProceduralActFormValues = {
    /** Lo escrito en el combobox: el nombre de un estado de la tabla o uno a mano. */
    stateText: string
    /** El id del estado elegido de la lista, como texto; `''` si es a mano. */
    proceduralStateId: string
    actDate: string
    notificationDate: string
    notes: string
    /** "Ajustar el vencimiento manualmente". */
    manualDue: boolean
    manualDueDate: string
}
