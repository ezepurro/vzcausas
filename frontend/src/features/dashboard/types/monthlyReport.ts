/**
 * El reporte mensual de gestión (HU43, V6 §3.13).
 *
 * Escrito a partir del contrato (L9341-9456), no copiado de `shared/mocks`.
 * El backend trae todo calculado: la pantalla no recalcula nada (D-120).
 */

import type { Jurisdiction } from '@/features/legal-params'

/** `CLOSED`: la foto del mes, no cambia. `IN_PROGRESS`: el mes en curso, al día. */
export type ReportPeriodStatus = 'CLOSED' | 'IN_PROGRESS'

/** Los cuatro tramos del avance de la prescripción, en orden (V6 `PrescriptionBand`). */
export const PRESCRIPTION_BANDS = ['UNDER_50', 'FROM_50_TO_70', 'FROM_70_TO_90', 'FROM_90'] as const
export type PrescriptionBand = (typeof PRESCRIPTION_BANDS)[number]

export interface MonthlyReportSummary {
    /** "Causas activas": activas al cierre. */
    activeCases: number
    /** "Ingresadas en el mes". */
    admitted: number
    /** "Archivadas en el mes". */
    archived: number
    /** Diferencia con el mes anterior. `null` si ese mes no tiene reporte. */
    admittedChange: number | null
    archivedChange: number | null
    /**
     * "Promedio por abogado", con un decimal: `activeCases` menos
     * `unassigned.total`, sobre la cantidad de abogados (D-145).
     */
    averagePerLawyer: number
    /** "Entre 13 y 17 causas". `null` si no hay abogados. */
    minPerLawyer: number | null
    maxPerLawyer: number | null
}

export interface MonthlyReportJurisdiction {
    jurisdiction: Jurisdiction
    atStart: number
    admitted: number
    archived: number
    atEnd: number
    /** `atEnd` sobre `summary.activeCases`, redondeado. */
    percentage: number
}

export interface MonthlyReportLawyer {
    /** Como era al tomar los datos: en un mes cerrado puede ser uno dado de baja. */
    lawyer: { id: number; lastName: string; firstName: string; registrationNumber: string | null }
    criminal: number
    administrative: number
    amparo: number
    total: number
    differenceFromAverage: number
}

/**
 * El renglón "Sin asignar" de la carga por abogado: las causas huérfanas
 * activas al cierre, sin responsable (D-145). Solo se cuentan, no se nombran.
 * No es un abogado: no entra en el promedio, el mínimo ni el máximo.
 * Siempre viene, con ceros si no hay.
 */
export interface MonthlyReportUnassigned {
    criminal: number
    administrative: number
    amparo: number
    total: number
}

/** Un mes del año. Un mes anterior a `availableFrom` trae las cifras en `null`. */
export interface MonthlyReportMonth {
    period: string
    admitted: number | null
    archived: number | null
    balance: number | null
    activeAtEnd: number | null
}

export interface MonthlyReportState {
    proceduralStateId: number | null
    name: string
    initial: boolean
    custom: boolean
    activeCases: number
}

export interface MonthlyReportJurisdictionStates {
    jurisdiction: Jurisdiction
    activeCases: number
    /** Primero "Iniciada", después en el orden de `GET /procedural-states` (D-120). */
    states: MonthlyReportState[]
}

export interface MonthlyReportPrescriptionAlert {
    caseId: number
    sacNumber: string | null
    caption: string
    /** `null` en una causa huérfana (D-145): el PDF la imprime como "Sin asignar". */
    responsibleLawyer: { id: number; lastName: string; firstName: string } | null
    legalQualificationName: string
    elapsedPercentage: number
    expired: boolean
}

export interface MonthlyReportPrescription {
    /** Causas penales activas al cierre con prescripción: el 100 % de los tramos. */
    cases: number
    bands: { band: PrescriptionBand; cases: number; percentage: number }[]
    alerts: MonthlyReportPrescriptionAlert[]
}

export interface MonthlyReportDeadlines {
    total: number
    metOnTime: number
    metOnLastDay: number
    overdue: number
    /** Solo en el mes en curso; en uno cerrado es `0`. */
    pending: number
    interruptiveActs: number
}

/** Lo que viene adentro de `data` en `GET /reports/monthly`. */
export interface MonthlyReport {
    /** `AAAA-MM`. */
    period: string
    status: ReportPeriodStatus
    /** "Datos al": el último día del mes, u hoy en el mes en curso. */
    dataAsOf: string
    takenAt: string
    /** Primer mes con reporte (D-137). */
    availableFrom: string
    /** Mes en curso. */
    currentPeriod: string
    summary: MonthlyReportSummary
    byJurisdiction: MonthlyReportJurisdiction[]
    lawyers: MonthlyReportLawyer[]
    /** `summary.activeCases` es la suma de los `total` de `lawyers` y de `unassigned.total` (D-145). */
    unassigned: MonthlyReportUnassigned
    monthly: MonthlyReportMonth[]
    proceduralStates: MonthlyReportJurisdictionStates[]
    prescription: MonthlyReportPrescription
    deadlines: MonthlyReportDeadlines
}
