import type { PillTone } from '@/shared/components/ui'
import type { DashboardDeadline, OpenDeadlineCounts } from '@/features/dashboard/types/dashboard'

/** "Esta semana": los próximos 5 días hábiles */
const SOON_DAYS = 5

/** Los cuatro grupos, en el orden en que se muestran. */
export const URGENCIES = ['overdue', 'today', 'thisWeek', 'later'] as const
export type Urgency = (typeof URGENCIES)[number]

export const URGENCY_LABELS: Record<Urgency, string> = {
    overdue: 'Vencidos',
    today: 'Hoy',
    thisWeek: 'Esta semana',
    later: 'Después',
}

export const URGENCY_TONES: Record<Urgency, PillTone> = {
    overdue: 'danger',
    today: 'danger',
    thisWeek: 'warn',
    later: 'ok',
}

/** En qué grupo cae un plazo: negativo vencido, 0 hoy, 1 a 5 esta semana. */
export function urgencyOf(businessDaysRemaining: number): Urgency {
    if (businessDaysRemaining < 0) return 'overdue'
    if (businessDaysRemaining === 0) return 'today'
    if (businessDaysRemaining <= SOON_DAYS) return 'thisWeek'
    return 'later'
}

export interface DeadlineGroup {
    urgency: Urgency
    label: string
    items: DashboardDeadline[]
}

export function groupByUrgency(deadlines: DashboardDeadline[]): DeadlineGroup[] {
    return URGENCIES.map((urgency) => ({
        urgency,
        label: URGENCY_LABELS[urgency],
        items: deadlines.filter((d) => urgencyOf(d.businessDaysRemaining) === urgency),
    }))
}

const days = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`

/** "Lo primero de hoy": "Venció hace 7 días", "Vence hoy", "Vence en 3 días". */
export function dueText(businessDaysRemaining: number): string {
    if (businessDaysRemaining < 0) return `Venció hace ${days(-businessDaysRemaining)}`
    if (businessDaysRemaining === 0) return 'Vence hoy'
    return `Vence en ${days(businessDaysRemaining)}`
}

/** El chip corto de cada plazo en la lista: "Hace 7 días", "Vence hoy", "En 3 días". */
export function shortDueText(businessDaysRemaining: number): string {
    if (businessDaysRemaining < 0) return `Hace ${days(-businessDaysRemaining)}`
    if (businessDaysRemaining === 0) return 'Vence hoy'
    return `En ${days(businessDaysRemaining)}`
}

export interface TeamStatus {
    label: string
    tone: PillTone
}

/**
 * El rótulo de un abogado en "Carga del equipo": manda lo más
 * urgente que tenga.
 */
export function teamStatus(counts: OpenDeadlineCounts): TeamStatus {
    if (counts.overdue > 0) return { label: 'Con vencidos', tone: 'danger' }
    if (counts.dueToday > 0) return { label: 'Vence hoy', tone: 'danger' }
    if (counts.dueSoon > 0) return { label: 'Atención esta semana', tone: 'warn' }
    return { label: 'Al día', tone: 'ok' }
}