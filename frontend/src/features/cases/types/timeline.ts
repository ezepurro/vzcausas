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
    /**
     * El acto del que cuenta `prescription` de la causa (D-113). No siempre el
     * más reciente: uno posterior al vencimiento de una calificación no la
     * reinicia, y sin calificaciones ninguno rige.
     */
    governsPrescription: boolean
    interruptiveAct: InterruptiveAct
}

/** D-113: una calificación declarada prescripta. */
export interface TimelineQualificationPrescriptionEntry {
    type: 'QUALIFICATION_PRESCRIPTION_DECLARATION'
    date: string
    legalQualification: { id: number; name: string }
    prescriptionDeclaration: PrescriptionDeclaration
}

export interface TimelinePrescriptionEntry {
    type: 'PRESCRIPTION_DECLARATION'
    date: string
    prescriptionDeclaration: PrescriptionDeclaration
}

type PersonRef = { id: number; lastName: string; firstName: string }

/**
 * Un cambio de abogado responsable (D-147, V6 §3.7, "Cambio de responsable en
 * la línea de vida"): una reasignación, el reparto de la baja de un abogado o
 * la causa que esa baja deja huérfana. Solo hacia adelante: los cambios
 * anteriores a esa revisión no aparecen.
 */
export interface ResponsibleLawyerChange {
    id: number
    caseId: number
    /**
     * `REASSIGNED`: de un abogado a otro. `ORPHANED`: quedó sin abogado
     * (D-143). `ASSIGNED_FROM_ORPHAN`: una causa huérfana recibió abogado.
     */
    kind: 'REASSIGNED' | 'ORPHANED' | 'ASSIGNED_FROM_ORPHAN'
    /** Como es hoy, aunque esté dado de baja. `null` en `ASSIGNED_FROM_ORPHAN`. */
    previousLawyer: PersonRef | null
    /** `null` en `ORPHANED`. */
    newLawyer: PersonRef | null
    /** `LAWYER_REMOVAL`: la baja de un abogado. `MANUAL`: un `PATCH /cases/{caseId}`. */
    origin: 'LAWYER_REMOVAL' | 'MANUAL'
    /** El usuario que hizo el cambio: no necesariamente un abogado. */
    changedBy: PersonRef
    /** ISO 8601, con el huso del estudio. */
    changedAt: string
}

export interface TimelineResponsibleLawyerChangeEntry {
    type: 'RESPONSIBLE_LAWYER_CHANGE'
    /** La fecha de `changedAt`, en Córdoba. */
    date: string
    responsibleLawyerChange: ResponsibleLawyerChange
}

export type TimelineEntry =
    | TimelineProceduralActEntry
    | TimelineInterruptiveActEntry
    | TimelineQualificationPrescriptionEntry
    | TimelinePrescriptionEntry
    | TimelineResponsibleLawyerChangeEntry
