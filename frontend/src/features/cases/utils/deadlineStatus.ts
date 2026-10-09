/**
 * El chip del vencimiento de una causa: la columna "Próximo vencimiento" del
 * listado y el del encabezado del detalle.
 *
 * El vencimiento es parte del estado actual (V3 D-35): ya no existe
 * `nextDeadline`. El backend manda `businessDaysRemaining` ya calculado contra
 * la fecha del día en Córdoba (V3 §4); acá sólo se traduce a texto y a tono,
 * con los mismos cortes que el prototipo.
 */

import type { PillTone } from '@/shared/components/ui'
import type { CurrentState } from '@/features/cases/types/case'

/** Hasta cuántos días hábiles un plazo se muestra "por vencer". */
const SOON_DAYS = 5

export interface DeadlineStatus {
    label: string
    tone: PillTone
    /** Punto relleno si pide atención; hueco si no. */
    dot: true | 'hollow'
}

export function deadlineStatus(
    state: Pick<CurrentState, 'dueDate' | 'businessDaysRemaining'>,
): DeadlineStatus {
    // Sin plazo abierto: es una causa "para impulsar", no una urgencia. Es
    // también el caso de una causa recién registrada, en "Iniciada".
    if (state.dueDate === null || state.businessDaysRemaining === null) {
        return { label: 'Sin plazo abierto', tone: 'neutral', dot: 'hollow' }
    }

    const days = state.businessDaysRemaining

    if (days < 0) {
        const n = Math.abs(days)
        return { label: `Vencido hace ${n} ${n === 1 ? 'día' : 'días'}`, tone: 'danger', dot: true }
    }
    if (days === 0) return { label: 'Vence hoy', tone: 'danger', dot: true }

    const label = `En ${days} ${days === 1 ? 'día hábil' : 'días hábiles'}`
    return days <= SOON_DAYS
        ? { label, tone: 'warn', dot: true }
        : { label, tone: 'neutral', dot: 'hollow' }
}
