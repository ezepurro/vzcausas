/**
 * Los períodos del reporte mensual (`AAAA-MM`, V6 §3.13). Funciones puras: el
 * rango sale de `availableFrom` y `currentPeriod`, que manda el backend.
 */

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const RE_PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/

/** `true` si tiene la forma `AAAA-MM`. */
export function isPeriod(value: string | null): value is string {
    return value !== null && RE_PERIOD.test(value)
}

/** El período corrido `months` meses (negativo hacia atrás). */
export function shiftPeriod(period: string, months: number): string {
    const [year, month] = period.split('-').map(Number)
    const total = year * 12 + (month - 1) + months
    const y = Math.floor(total / 12)
    const m = (total % 12) + 1
    return `${y}-${String(m).padStart(2, '0')}`
}

/** De `from` a `to`, los dos incluidos, en orden. */
export function periodRange(from: string, to: string): string[] {
    const out: string[] = []
    for (let p = from; p <= to; p = shiftPeriod(p, 1)) out.push(p)
    return out
}

/** "Agosto 2026". */
export function periodLabel(period: string): string {
    const [year, month] = period.split('-').map(Number)
    return `${MONTHS[month - 1]} ${year}`
}

/** "Ago". */
export function shortMonth(period: string): string {
    const month = Number(period.split('-')[1])
    return MONTHS[month - 1].slice(0, 3)
}

/** "agosto". */
export function monthName(period: string): string {
    const month = Number(period.split('-')[1])
    return MONTHS[month - 1].toLowerCase()
}

/** "Último cerrado": el mes anterior al en curso, si tiene reporte (V6 L9328). */
export function lastClosedPeriod(availableFrom: string, currentPeriod: string): string | null {
    const previous = shiftPeriod(currentPeriod, -1)
    return previous >= availableFrom ? previous : null
}

/** "+7 respecto del mes anterior". `null` si el mes anterior no tiene reporte. */
export function changeNote(change: number | null): string | null {
    if (change === null) return null
    return `${change > 0 ? '+' : ''}${change} respecto del mes anterior`
}

/** Un decimal, con coma: "14,1". */
export function formatDecimal(value: number): string {
    return value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
}
