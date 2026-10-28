/**
 * Fechas para mostrar.
 *
 * Vive en `shared/lib` y no adentro de un módulo porque la misma fecha se va
 * a mostrar igual en usuarios, en causas y en plazos: si cada feature la
 * formatea a su manera, la aplicación habla con dos voces.
 *
 * El contrato manda dos formas: instantes ISO 8601 con offset (`lastLoginAt`)
 * y fechas sin hora `YYYY-MM-DD` (`startDate`, `dueDate`, `clientSince`). Cada
 * una tiene su función, porque se leen distinto.
 */

/* `hourCycle: 'h23'`: el estudio lee la hora en 24 horas, como el prototipo
   ("08:12", "a las 11:42"). Sin él, `es-AR` la da en 12 ("10:42 a. m."). */
const TIME = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
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
 * Un instante ISO 8601 con offset, con la fecha y la hora: `09/09/2026 a las
 * 11:42`. Es la forma de "cuándo se registró" algo (`registeredAt`).
 *
 * A diferencia de las fechas sin hora, acá sí se usa `new Date(iso)`: el
 * instante trae su offset, y lo que importa es la hora local de quien lo lee.
 */
export function formatDateTime(iso: string | null): string {
    if (!iso) return EMPTY

    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return EMPTY

    return `${DATE.format(date)} a las ${TIME.format(date)}`
}

/**
 * La hora de un instante ISO 8601: `10:42`. Es la de "Sincronizado con
 * Drive · 10:42" (HU38). Como en `formatDateTime`, vale la hora local de quien
 * lo lee.
 */
export function formatTime(iso: string | null): string {
    if (!iso) return EMPTY

    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? EMPTY : TIME.format(date)
}

/**
 * La fecha de un instante ISO 8601, sin la hora: `09/09/2026`. Para un dato
 * que es un momento, pero del que alcanza con el día (cuándo se subió un
 * documento a Drive, HU38).
 *
 * No es `formatDate`: esa recibe una fecha sin hora (`YYYY-MM-DD`) y no pasa
 * por `new Date`. Acá el instante trae su offset y se muestra el día local.
 */
export function formatInstantDate(iso: string | null): string {
    if (!iso) return EMPTY

    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? EMPTY : DATE.format(date)
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

/** `YYYY-MM-DD`, con el mes y el día de dos cifras. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Una fecha sin hora del contrato, como la lee el estudio: `2026-09-15` →
 * `15/09/2026`.
 *
 * No pasa por `new Date('2026-09-15')` a propósito: esa forma el navegador la
 * interpreta como medianoche en UTC, que en Córdoba (UTC-3) es el 14 a las
 * 21:00, y la pantalla mostraría un día antes. La fecha se arma con sus
 * partes, en la zona del navegador, y así nunca se corre.
 *
 * `null` es legítimo: una causa sin plazo abierto, un dato opcional.
 */
export function formatDate(isoDate: string | null): string {
    const date = parseDateOnly(isoDate)
    return date ? DATE.format(date) : EMPTY
}

/**
 * La fecha de hoy como la manda y la recibe el contrato, `YYYY-MM-DD`.
 *
 * Es el valor por defecto del `<input type="date">` de la fecha de un acto, y
 * el tope de las fechas que no pueden ser futuras. Mismo cuidado que en `formatDate`:
 * `toISOString()` devuelve la fecha en UTC, y después de las 21:00 en Córdoba
 * ya diría mañana.
 */
export function todayIsoDate(): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * `YYYY-MM-DD` a `Date` local (medianoche en la zona del navegador), o `null`
 * si no es una fecha válida. Para hacer cuentas con fechas del contrato sin
 * que se corran un día: nunca `new Date('2026-09-15')`.
 *
 * El `Date` se compara contra sus propias partes porque el constructor no
 * rechaza nada: `new Date(2026, 1, 31)` es el 3 de marzo, y `2026-02-31` no
 * tiene que tomarse como una fecha que existe.
 */
export function parseDateOnly(isoDate: string | null): Date | null {
    const match = isoDate ? DATE_ONLY.exec(isoDate) : null
    if (!match) return null

    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
    const date = new Date(year, month - 1, day)
    const exists =
        date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day

    return exists ? date : null
}
