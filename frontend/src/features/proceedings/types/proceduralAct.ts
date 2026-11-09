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
 * Este módulo tiene el registro (HU26), su previsualización y la
 * modificación (HU28). La consulta es la línea de vida de la causa (HU27), en
 * `cases`; anular un acto (HU29) queda fuera del contrato.
 */

import type { ActDeadline, ProceduralAct, ResultingState } from '@/features/cases'
import type { DayType } from '@/features/legal-params'

/**
 * El estado al que pasó la causa con el acto, el plazo que abre y el acto
 * mismo. Los define `cases`, porque la línea de vida de la causa (HU27) trae
 * el acto embebido y las dependencias van `proceedings → cases`. Se
 * reexportan porque son la forma de un acto.
 *
 * `ResultingState` es sólo una parte del `currentState` de la causa —no trae
 * el vencimiento, que va en `deadline`— y nunca es el estado inicial
 * "Iniciada" (V3 §3.8).
 */
export type { ActDeadline, ProceduralAct, ResultingState }

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

/**
 * Cuerpo del `PATCH /cases/{caseId}/procedural-acts/{actId}` (V5 §3.8): todo
 * opcional, al menos un campo. Las restricciones son las del registro, sobre
 * el acto como queda. `null` en `manualDueDate` quita el ajuste y vuelve al
 * vencimiento calculado; en `notes` y `notificationDate`, los borra.
 */
export interface UpdateProceduralActBody {
    proceduralStateId?: number
    customState?: string
    actDate?: string
    notificationDate?: string | null
    manualDueDate?: string | null
    notes?: string | null
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
