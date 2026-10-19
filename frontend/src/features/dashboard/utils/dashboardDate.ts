/**
 * Las fechas largas de los tableros, con los textos del prototipo:
 * "Martes 15 de septiembre de 2026" y "Septiembre 2026".
 *
 * No se usa `Intl.DateTimeFormat`: en `es-AR` arma "martes, 15 de septiembre
 * de 2026", con coma y en minúscula. Las fechas del contrato se leen con
 * `parseDateOnly`, nunca con `new Date('2026-09-15')`.
 */

import { parseDateOnly } from '@/shared/lib/dates'

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** `2026-09-15` → "Martes 15 de septiembre de 2026". Vacío si la fecha no es válida. */
export function longDate(isoDate: string): string {
    const date = parseDateOnly(isoDate)
    if (!date) return ''
    return `${WEEKDAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`
}

/** Título del calendario mensual: "Septiembre 2026". El mes va de 0 a 11, como en `Date`. */
export function monthTitle(year: number, month: number): string {
    return `${capitalize(MONTHS[month])} ${year}`
}
const SHORT_WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export interface DayParts {
    weekday: string
    day: string
    month: string
}

/** `2026-09-15` → `{ weekday: 'Mar', day: '15', month: 'sep' }`, la fecha de la línea de vencimientos. */
export function dayParts(isoDate: string): DayParts | null {
    const date = parseDateOnly(isoDate)
    if (!date) return null
    return {
        weekday: SHORT_WEEKDAYS[date.getDay()],
        day: String(date.getDate()).padStart(2, '0'),
        month: SHORT_MONTHS[date.getMonth()],
    }
}

/** `2026-09-15` → "mar 15/09", el rótulo de la marca de hoy en la línea. */
export function shortDayLabel(isoDate: string): string {
    const date = parseDateOnly(isoDate)
    if (!date) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${SHORT_WEEKDAYS[date.getDay()].toLowerCase()} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}
