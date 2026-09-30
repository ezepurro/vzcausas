/**
 * El renglón debajo de la fecha de vencimiento en "Cómputo del plazo":
 * `martes · faltan 5 días hábiles`, `es hoy`, `hace 2 días hábiles`.
 *
 * Los días los manda el backend (`businessDaysRemaining`); acá sólo se
 * redactan. El día de la semana sale de la fecha, leída sin corrimiento.
 */

import { parseDateOnly } from '@/shared/lib/dates'

const WEEKDAY = new Intl.DateTimeFormat('es-AR', { weekday: 'long' })

export function dueDateDetail(dueDate: string, businessDaysRemaining: number | null): string {
    const date = parseDateOnly(dueDate)
    const weekday = date ? WEEKDAY.format(date) : ''

    if (businessDaysRemaining === null) return weekday

    const n = Math.abs(businessDaysRemaining)
    const days = `${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`
    const when =
        businessDaysRemaining > 0 ? `faltan ${days}`
            : businessDaysRemaining === 0 ? 'es hoy'
                : `hace ${days}`

    return weekday ? `${weekday} · ${when}` : when
}

/** El tono del recuadro del vencimiento, con los mismos cortes que el listado. */
export function dueDateTone(businessDaysRemaining: number | null): 'ok' | 'warn' | 'danger' | 'neutral' {
    if (businessDaysRemaining === null) return 'neutral'
    if (businessDaysRemaining <= 0) return 'danger'
    return businessDaysRemaining <= 5 ? 'warn' : 'ok'
}
