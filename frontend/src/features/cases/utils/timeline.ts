/**
 * El plazo de cada acto procesal en la línea de vida (HU27).
 *
 * Sólo el del acto `current` está abierto (V4 D-85, CA-27.4): lleva el chip
 * con los textos del prototipo, "Plazo vencido el 11/09/2026", "Vence hoy ·
 * 15/09/2026" o "Plazo abierto · vence 16/09/2026". Los de los demás actos se
 * muestran cerrados.
 *
 * El plazo es el que se copió al registrar el acto (CA-27.7): cambiar después
 * la tabla del fuero no lo altera, así que se lee de `deadline` y no del estado.
 */

import type { PillTone } from '@/shared/components/ui'
import { formatDate, todayIsoDate } from '@/shared/lib/dates'
import { DAY_TYPE_LABELS } from '@/features/legal-params'
import type { ActDeadline } from '@/features/cases/types/proceduralAct'

/** "Plazo de 5 días hábiles", con el que se registró el acto. */
export function actTermText(deadline: Pick<ActDeadline, 'timeLimitDays' | 'dayType'>): string {
    const n = deadline.timeLimitDays
    return `Plazo de ${n} ${n === 1 ? 'día' : 'días'} ${DAY_TYPE_LABELS[deadline.dayType].toLowerCase()}`
}

/** El plazo de un acto que ya no es el vigente: "Plazo cerrado · vencía 11/09/2026". */
export function closedDeadlineText(dueDate: string): string {
    return `Plazo cerrado · vencía ${formatDate(dueDate)}`
}

export interface ActDeadlineBadge {
    label: string
    tone: PillTone
    /** Vencido o vence hoy: pinta en rojo el punto de la línea. */
    urgent: boolean
}

export function actDeadlineBadge(dueDate: string, today: string = todayIsoDate()): ActDeadlineBadge {
    const date = formatDate(dueDate)
    // Las fechas `YYYY-MM-DD` se comparan como texto: no hay que armar un Date.
    if (dueDate < today) return { label: `Plazo vencido el ${date}`, tone: 'danger', urgent: true }
    if (dueDate === today) return { label: `Vence hoy · ${date}`, tone: 'danger', urgent: true }
    return { label: `Plazo abierto · vence ${date}`, tone: 'warn', urgent: false }
}
