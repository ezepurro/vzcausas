/**
 * Fechas para mostrar.
 *
 * Vive en `shared/lib` y no adentro de un módulo porque la misma fecha se va
 * a mostrar igual en usuarios, en causas y en plazos: si cada feature la
 * formatea a su manera, la aplicación habla con dos voces.
 *
 * Todo lo que entra es ISO 8601 con offset, que es lo que manda el contrato.
 */

const TIME = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' })
const DATE = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
})

/** Lo que se muestra cuando no hay dato. */
const EMPTY = '—'

/**
 * Último ingreso, tal como lo muestra el prototipo: `Hoy 08:12`,
 * `Ayer 18:20` o `08/09/2026`.
 *
 * La hora sólo aparece en los dos días recientes porque es lo único donde
 * agrega algo: saber que alguien entró a las 10:02 hace tres semanas no le
 * sirve a nadie.
 *
 * `null` es un caso legítimo y no un error: significa que el usuario nunca
 * inició sesión, y es lo que devuelve el contrato para un alta recién hecha.
 */
export function formatLastLogin(iso: string | null): string {
    if (!iso) return EMPTY

    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return EMPTY

    const days = daysAgo(date)
    if (days === 0) return `Hoy ${TIME.format(date)}`
    if (days === 1) return `Ayer ${TIME.format(date)}`
    return DATE.format(date)
}

/**
 * Cuántos días calendario pasaron, no cuántas 24 horas.
 *
 * La diferencia importa: a las 00:30 de hoy, algo de las 23:50 de ayer pasó
 * hace cuarenta minutos, pero corresponde decir "Ayer" y no "Hoy".
 */
function daysAgo(date: Date): number {
    const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const MS_PER_DAY = 86_400_000
    return Math.round((start(new Date()) - start(date)) / MS_PER_DAY)
}
