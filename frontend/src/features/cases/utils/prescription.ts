/**
 * La barra de prescripción de la causa: cuánto del plazo ya pasó y cuánto
 * falta.
 *
 * Desde V4 la calificación que prescribe primero, el porcentaje y la alerta
 * llegan resueltos en `prescription` de la causa (D-51), y la barra los lee de
 * ahí. Del lado del front quedan el rótulo "Restan 5 años 9 meses"
 * (`remainingLabel`), la nota del pie (`prescriptionNote`) y el vencimiento
 * estimado del resumen del alta, antes de que la causa exista.
 *
 * `nearestQualification` y `prescriptionProgress` son del cálculo de V3: ya
 * ninguna pantalla los usa, pero siguen acá porque los cubren sus tests.
 */

import { formatDate, parseDateOnly } from '@/shared/lib/dates'
import type { MeterTone } from '@/shared/components/ui'
import type { Case, CaseLegalQualification } from '@/features/cases/types/case'

/**
 * "Restan 5 años 9 meses", "Restan 20 días": lo que falta hasta `expiresOn`.
 * Con el plazo ya cumplido, "Plazo cumplido".
 */
export function remainingLabel(expiresOn: string, today: Date = new Date()): string {
    const end = parseDateOnly(expiresOn)
    if (!end) return ''
    const now = startOfDay(today)
    return now >= end ? 'Plazo cumplido' : `Restan ${remainingText(now, end)}`
}

/**
 * La nota al pie de la barra: desde cuándo corre el cómputo —el último acto
 * interruptivo o la fecha del hecho (V4 D-49)— y, si la causa tiene varias
 * calificaciones, cuál es la que se muestra.
 */
export function prescriptionNote(
    c: Pick<Case, 'prescription' | 'legalQualifications'>,
): string | undefined {
    if (!c.prescription) return undefined
    const { lastInterruptiveActDate, legalQualificationName } = c.prescription
    const base = lastInterruptiveActDate
        ? `Cómputo reiniciado por el acto interruptivo registrado el ${formatDate(lastInterruptiveActDate)}.`
        : 'Sin actos interruptivos registrados: el cómputo corre desde la fecha del hecho.'
    return c.legalQualifications.length > 1
        ? `${base} Calificación que prescribe primero: ${legalQualificationName}.`
        : base
}

/** Pasado este porcentaje la barra se pinta en bronce, como en el prototipo. */
const WARN_PERCENT = 70

export interface PrescriptionProgress {
    /** 0 a 100. */
    percent: number
    /** "Restan 5 años 9 meses", "Restan 20 días", "Prescripta". */
    remaining: string
    tone: MeterTone
}

/**
 * Con varias calificaciones, cada una prescribe por su lado (V3 §3.5). La
 * barra del encabezado muestra **la que prescribe primero**, que es la que
 * manda. `null` si la causa no tiene calificaciones (fuera del fuero penal).
 */
export function nearestQualification(c: Pick<Case, 'legalQualifications'>): CaseLegalQualification | null {
    if (c.legalQualifications.length === 0) return null
    return [...c.legalQualifications].sort((a, b) =>
        a.prescriptionExpiresOn.localeCompare(b.prescriptionExpiresOn),
    )[0]
}

/**
 * Cuánto pasó entre `startsOn` y `expiresOn`: el `prescriptionStartsOn` y el
 * `prescriptionExpiresOn` de una calificación.
 */
export function prescriptionProgress(
    startsOn: string,
    expiresOn: string,
    today: Date = new Date(),
): PrescriptionProgress | null {
    const start = parseDateOnly(startsOn)
    const end = parseDateOnly(expiresOn)
    if (!start || !end || end <= start) return null

    const now = startOfDay(today)
    const total = end.getTime() - start.getTime()
    const elapsed = Math.min(Math.max(now.getTime() - start.getTime(), 0), total)
    const percent = Math.round((elapsed / total) * 100)

    return {
        percent,
        remaining: now >= end ? 'Prescripta' : `Restan ${remainingText(now, end)}`,
        tone: now >= end ? 'danger' : percent > WARN_PERCENT ? 'warn' : 'primary',
    }
}

/**
 * Vencimiento estimado para el resumen del alta, antes de guardar la causa:
 * la **fecha del hecho** de la calificación más sus meses, que es la misma
 * cuenta que hace el backend (V3 D-19). Devuelve `YYYY-MM-DD`, o `null` si
 * todavía no se cargó la fecha.
 */
export function estimatedExpiry(offenseDate: string, months: number): string | null {
    const start = parseDateOnly(offenseDate)
    if (!start) return null
    const end = new Date(start.getFullYear(), start.getMonth() + months, start.getDate())
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
}

/** "5 años 9 meses", "3 meses", "20 días": lo que falta, en la unidad que se lee. */
function remainingText(from: Date, to: Date): string {
    let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
    if (to.getDate() < from.getDate()) months -= 1

    if (months <= 0) {
        const days = Math.ceil((to.getTime() - from.getTime()) / 86_400_000)
        return `${days} ${days === 1 ? 'día' : 'días'}`
    }

    const years = Math.floor(months / 12)
    const rest = months % 12
    const parts = [
        years > 0 ? `${years} ${years === 1 ? 'año' : 'años'}` : '',
        rest > 0 ? `${rest} ${rest === 1 ? 'mes' : 'meses'}` : '',
    ]
    return parts.filter(Boolean).join(' ')
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
