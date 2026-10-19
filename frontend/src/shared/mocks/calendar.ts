/**
 * El calendario del mock: fechas sin hora y cómputo de plazos.
 *
 * Implementa §4 "Cómputo de días" del contrato V3. Lo usan los tres lados del
 * mock —las semillas, la base y los handlers— para que una fecha calculada al
 * sembrar los datos sea la misma que calcularía el servidor falso al registrar
 * el acto.
 *
 * Todas las fechas son `YYYY-MM-DD`, que es como viajan en el contrato. "Hoy"
 * es el día del reloj del sistema en la zona del navegador: el mock no fija
 * una fecha propia. Para fijar el día en un test, ver el README.
 *
 * Como el contrato, **no descuenta feriados ni la feria judicial** (C-05): los
 * días hábiles son de lunes a viernes.
 */

import type { DayType } from './contract';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** `Date` local → `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * `YYYY-MM-DD` → `Date` local, o `null` si no es una fecha que exista.
 *
 * Nunca `new Date('2026-09-15')`: eso es medianoche en UTC y en Córdoba cae el
 * día anterior. Y `new Date(2026, 1, 31)` no falla, devuelve el 3 de marzo:
 * por eso se compara contra las partes.
 */
export function parseIsoDate(value: unknown): Date | null {
    if (typeof value !== 'string') return null;
    const match = ISO_DATE.exec(value);
    if (!match) return null;

    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(year, month - 1, day);
    const exists =
        date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return exists ? date : null;
}

/** `true` si es un `YYYY-MM-DD` que existe en el calendario. */
export function isIsoDate(value: unknown): value is string {
    return parseIsoDate(value) !== null;
}

/** La fecha de hoy, `YYYY-MM-DD`. */
export function todayIso(): string {
    return toIsoDate(new Date());
}

function isBusinessDay(date: Date): boolean {
    const weekday = date.getDay();
    return weekday !== 0 && weekday !== 6;
}

function mustParse(iso: string): Date {
    const date = parseIsoDate(iso);
    if (!date) throw new Error(`[mock] "${iso}" no es una fecha YYYY-MM-DD válida.`);
    return date;
}

/** Suma `days` días corridos. Acepta negativos. */
export function addCalendarDays(iso: string, days: number): string {
    const date = mustParse(iso);
    date.setDate(date.getDate() + days);
    return toIsoDate(date);
}

/**
 * Suma `days` días hábiles **a partir del día siguiente**, como pide el
 * contrato. Con `0` devuelve la misma fecha.
 */
export function addBusinessDays(iso: string, days: number): string {
    const date = mustParse(iso);
    let counted = 0;
    while (counted < days) {
        date.setDate(date.getDate() + 1);
        if (isBusinessDay(date)) counted += 1;
    }
    return toIsoDate(date);
}

/**
 * La fecha que quedó `days` días hábiles atrás. Es la inversa de
 * `addBusinessDays` y sólo la usan las semillas, para ubicar los actos
 * respecto de hoy. Siempre cae en un día hábil (salvo con `0`).
 */
export function subtractBusinessDays(iso: string, days: number): string {
    const date = mustParse(iso);
    let counted = 0;
    while (counted < days) {
        date.setDate(date.getDate() - 1);
        if (isBusinessDay(date)) counted += 1;
    }
    return toIsoDate(date);
}

/**
 * Suma meses enteros conservando el día: es la cuenta de la prescripción
 * (`prescriptionStartsOn` más `prescriptionMonths`, V3 D-19). Mismo criterio
 * que el prototipo, incluido el desborde de fin de mes.
 */
export function addMonths(iso: string, months: number): string {
    const date = mustParse(iso);
    return toIsoDate(new Date(date.getFullYear(), date.getMonth() + months, date.getDate()));
}

/**
 * Días corridos de `fromIso` a `toIso`: negativo si `toIso` es anterior. Es la
 * cuenta del porcentaje de prescripción (V4 §4) y de los "71 días" sin
 * movimiento de las causas para impulsar (§3.11).
 */
export function calendarDaysBetween(fromIso: string, toIso: string): number {
    const from = mustParse(fromIso);
    const to = mustParse(toIso);
    const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/**
 * Días hábiles entre hoy (excluido) y el vencimiento (incluido): `0` vence
 * hoy, negativo ya venció. Es el `businessDaysRemaining` del contrato.
 */
export function businessDaysUntil(dueIso: string, fromIso: string = todayIso()): number {
    const cursor = mustParse(fromIso);
    const due = mustParse(dueIso);
    const direction = due.getTime() >= cursor.getTime() ? 1 : -1;

    let count = 0;
    while (toIsoDate(cursor) !== toIsoDate(due)) {
        cursor.setDate(cursor.getDate() + direction);
        if (isBusinessDay(cursor)) count += 1;
    }
    return count * direction;
}

/**
 * El vencimiento que sale de la tabla: `countsFrom` más el plazo del estado.
 * `null` si el estado no abre plazo.
 */
export function computeDueDate(
    countsFrom: string,
    timeLimitDays: number,
    dayType: DayType,
): string | null {
    if (timeLimitDays <= 0 || dayType === 'NONE') return null;
    return dayType === 'CONSECUTIVE'
        ? addCalendarDays(countsFrom, timeLimitDays)
        : addBusinessDays(countsFrom, timeLimitDays);
}
