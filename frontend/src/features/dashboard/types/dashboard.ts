import type { Jurisdiction } from '@/features/legal-params'
/** Origen de un vencimiento (V4 §2, `DeadlineKind`). */
export const DEADLINE_KINDS = ['PROCEDURAL_ACT', 'HARMFUL_ACT'] as const
export type DeadlineKind = (typeof DEADLINE_KINDS)[number]

/** Abogado dentro del tablero */
export interface DashboardLawyer {
    id: number
    lastName: string
    firstName: string
}

/** Cuatro indicadores de la franja superior, los 4 datos de la parte de arriba del tablero*/
export interface DashboardSummary {
    /** "Vencen hoy": `businessDaysRemaining` igual a 0. */
    dueToday: number
    /** "Vencidos": `businessDaysRemaining` negativo. */
    overdue: number
    /** "Próx. 5 días hábiles": `businessDaysRemaining` entre 1 y 5. */
    dueSoon: number
    /** "Mis causas activas" / "Causas activas". */
    activeCases: number
}

/**
 * Un vencimiento abierto: el plazo del acto procesal o el del acto lesivo de
 * un amparo. Llegan ordenados por urgencia (`dueDate` ascendente); el primero
 * es "Lo primero de hoy".
 */
export interface DashboardDeadline {
    caseId: number
    kind: DeadlineKind
    sacNumber: string | null
    caption: string
    jurisdiction: Jurisdiction
    currentStateName: string
    responsibleLawyer: DashboardLawyer
    /** `YYYY-MM-DD`. Nunca `new Date(...)`: usar `@/shared/lib/dates`. */
    dueDate: string
    /** Días hábiles hasta el vencimiento. 0, hoy; negativo, vencido. */
    businessDaysRemaining: number
}


/** Una causa penal con el 70 % o más de su plazo de prescripción transcurrido. */
export interface PrescriptionAlert {
    caseId: number
    sacNumber: string | null
    caption: string
    responsibleLawyer: DashboardLawyer
    /** La calificación que prescribe primero. */
    legalQualificationName: string
    startsOn: string
    expiresOn: string
    /** "78 % transcurrido". */
    elapsedPercentage: number
    expired: boolean
}
/** Causas para impulsar*/
export interface CaseToAdvance {
    caseId: number
    sacNumber: string | null
    caption: string
    jurisdiction: Jurisdiction
    /** "Iniciada" si la causa no tiene actos. */
    currentStateName: string
    /** "Última actuación". `null` si la causa no tiene ningún acto. */
    lastActDate: string | null
    /** Días corridos desde `lastActDate`. `null` si no hay actos. */
    daysSinceLastAct: number | null
}

/** `GET /dashboards/lawyer`: "Mi día". */
export interface LawyerDashboard {
    /** Fecha del día en Córdoba contra la que se calculó todo. */
    date: string
    lawyer: DashboardLawyer
    summary: DashboardSummary
    deadlines: DashboardDeadline[]
    prescriptionAlerts: PrescriptionAlert[]
    casesToAdvance: CaseToAdvance[]
}

/** "Cartera por fuero": siempre vienen los tres fueros, aunque alguno tenga 0. */
export interface CasesByJurisdiction {
    jurisdiction: Jurisdiction
    activeCases: number
}

/** Plazos abiertos de un abogado, por urgencia. `later`: más de 5 días hábiles. */
export interface OpenDeadlineCounts {
    overdue: number
    dueToday: number
    dueSoon: number
    later: number
}

/** "Carga del equipo"*/
export interface TeamMember {
    lawyer: DashboardLawyer
    activeCases: number
    openDeadlines: OpenDeadlineCounts
}

/** `GET /dashboards/administrator`: "Estudio". */
export interface AdministratorDashboard {
    date: string
    summary: DashboardSummary
    casesByJurisdiction: CasesByJurisdiction[]
    deadlines: DashboardDeadline[]
    prescriptionAlerts: PrescriptionAlert[]
    team: TeamMember[]
}