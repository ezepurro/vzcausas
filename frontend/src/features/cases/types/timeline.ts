/**
 * La línea de vida de la causa (HU27): `GET /cases/{caseId}/timeline` (V4 D-85).
 *
 * Cada entrada trae su `type`, su `date` y el recurso tal como lo define su
 * propia sección del contrato, sin cambios. Llegan ya ordenadas, de la más
 * reciente a la más antigua: el front no las reordena.
 */

import type { PrescriptionDeclaration } from '@/features/cases/types/case'
import type { InterruptiveAct } from '@/features/cases/types/interruptiveAct'
import type { ProceduralAct } from '@/features/cases/types/proceduralAct'

export interface TimelineProceduralActEntry {
    type: 'PROCEDURAL_ACT'
    date: string
    /** El acto que llevó la causa a su estado actual: su plazo es el único abierto. */
    current: boolean
    proceduralAct: ProceduralAct
}

export interface TimelineInterruptiveActEntry {
    type: 'INTERRUPTIVE_ACT'
    date: string
    /** El acto interruptivo más reciente, el que rige el cómputo de la prescripción. */
    governsPrescription: boolean
    interruptiveAct: InterruptiveAct
}

export interface TimelinePrescriptionEntry {
    type: 'PRESCRIPTION_DECLARATION'
    date: string
    prescriptionDeclaration: PrescriptionDeclaration
}

export type TimelineEntry =
    | TimelineProceduralActEntry
    | TimelineInterruptiveActEntry
    | TimelinePrescriptionEntry
