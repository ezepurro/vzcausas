/**
 * El chip del plazo del acto vigente en la línea de vida (HU27), con los
 * textos del prototipo: "Plazo vencido el 11/09/2026", "Vence hoy ·
 * 15/09/2026", "Plazo abierto · vence 16/09/2026".
 *
 * Sólo lo lleva el acto `current`: los plazos de los demás actos están
 * cerrados (V4 D-85).
 */

import type { PillTone } from '@/shared/components/ui'
import { formatDate, todayIsoDate } from '@/shared/lib/dates'

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
