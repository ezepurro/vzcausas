/**
 * La barra de prescripción de la causa: cuánto del plazo ya pasó y cuánto
 * falta.
 *
 * El vencimiento lo calcula el backend (`prescriptionExpiresOn`); el contrato
 * deja explícitamente del lado del front el porcentaje transcurrido y el
 * "Restan 5 años 9 meses" (V3 §3.7). Es presentación, no una regla jurídica:
 * la regla —desde cuándo corre y cuánto dura— vive en el backend.
 */

import { parseDateOnly } from '@/shared/lib/dates'
import type { MeterTone } from '@/shared/components/ui'
import type { Case, CaseLegalQualification } from '@/features/cases/types/case'

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
 * barra del encabezado muestra la que vence primero, que es la que manda.
 */
export function nearestQualification(c: Case): CaseLegalQualification | null {
    if (c.legalQualifications.length === 0) return null
    return [...c.legalQualifications].sort((a, b) =>
        a.prescriptionExpiresOn.localeCompare(b.prescriptionExpiresOn),
    )[0]
}

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
 * fecha de inicio más los meses de la calificación, que es la misma cuenta
 * que hace el backend (V3 D-19). Devuelve `YYYY-MM-DD` o `null`.
 */
export function estimatedExpiry(startDate: string, months: number): string | null {
    const start = parseDateOnly(startDate)
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
