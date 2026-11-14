/**
 * La barra de prescripción de la causa: cuánto del plazo ya pasó y cuánto
 * falta.
 *
 * Desde V4 la calificación que prescribe primero, el porcentaje y la alerta
 * llegan resueltos en `prescription` de la causa (D-51), y la barra los lee de
 * ahí. Desde D-112 cada calificación trae también los suyos, y cuando la que
 * rige ya prescribió la barra pasa a la próxima (`shownPrescription`), sin
 * calcular nada. Del lado del front quedan el rótulo "Restan 5 años 9 meses"
 * (`remainingLabel`), la nota del pie (`prescriptionNote`) y el vencimiento
 * estimado del resumen del alta, antes de que la causa exista.
 *
 * `nearestQualification` y `prescriptionProgress` son del cálculo de V3: ya
 * ninguna pantalla los usa, pero siguen acá porque los cubren sus tests.
 */

import { formatDate, parseDateOnly } from '@/shared/lib/dates'
import type { MeterTone } from '@/shared/components/ui'
import type { Case, CaseLegalQualification, CasePrescription } from '@/features/cases/types/case'

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
 * Qué muestra la barra de prescripción (D-112, D-113):
 *
 * - `governing`: la que rige la causa, tal como llega en `prescription`,
 *   mientras no cumplió su plazo.
 * - `declared`: la causa ya fue marcada prescripta. Muestra `prescription`, que
 *   el backend elige entre todas como dato histórico (D-113), con la fecha de la
 *   declaración de la causa (`declaredOn`). La declaración manda sobre el
 *   cálculo: el cálculo sigue corriendo contra hoy y, si se declaró antes de
 *   que el plazo se cumpliera, no diría que la causa está cerrada.
 * - `next`: la que rige ya cumplió su plazo sin que nadie la declarara (sigue
 *   rigiendo, D-52) y hay otra sin declarar que todavía corre. Muestra esa, la
 *   más cercana a prescribir, con los valores que trae del backend.
 * - `allExpired`: todas las que faltan declarar cumplieron su plazo. No hay
 *   barra principal.
 *
 * Las declaradas prescriptas no cuentan (D-113): el backend ya no las elige
 * para `prescription`, y acá tampoco son la próxima. `null` fuera del penal o
 * sin calificaciones (D-74): ahí no se dibuja nada.
 */
export type ShownPrescription =
    | { kind: 'governing'; prescription: CasePrescription }
    | { kind: 'declared'; prescription: CasePrescription; declaredOn: string }
    | { kind: 'next'; prescription: CasePrescription }
    | { kind: 'allExpired' }

type PrescriptionFields = Pick<Case, 'prescription' | 'legalQualifications' | 'prescriptionDeclaration'>

export function shownPrescription(c: PrescriptionFields): ShownPrescription | null {
    const { prescription } = c
    if (!prescription) return null
    if (c.prescriptionDeclaration !== null) {
        return { kind: 'declared', prescription, declaredOn: c.prescriptionDeclaration.prescriptionDate }
    }

    const next = nextQualification(c)
    if (!next) return { kind: 'allExpired' }
    if (next.id === prescription.legalQualificationId) return { kind: 'governing', prescription }
    return {
        kind: 'next',
        prescription: {
            legalQualificationId: next.id,
            legalQualificationName: next.name,
            startsOn: next.prescriptionStartsOn,
            expiresOn: next.prescriptionExpiresOn,
            elapsedPercentage: next.elapsedPercentage,
            alert: next.alert,
            expired: next.expired,
            // Corre desde un acto sólo si el inicio no es la fecha del hecho (CA-31.5).
            lastInterruptiveActDate: next.prescriptionStartsOn === next.offenseDate ? null : next.prescriptionStartsOn,
        },
    }
}

/**
 * La calificación que prescribe próxima: la de menor vencimiento entre las que
 * no fueron declaradas y todavía corren (a igual vencimiento, la de menor id,
 * como el backend). `null` si no queda ninguna. Es la que la lista de
 * calificaciones marca "Próximo a prescribir".
 */
export function nextToPrescribe(c: Pick<Case, 'legalQualifications'>): number | null {
    return nextQualification(c)?.id ?? null
}

function nextQualification(c: Pick<Case, 'legalQualifications'>): CaseLegalQualification | null {
    return (
        c.legalQualifications
            .filter((q) => q.prescriptionDeclaration === null && !q.expired)
            .sort(byExpiry)[0] ?? null
    )
}

/**
 * Las otras calificaciones sin declarar que pasaron el 70 % de su plazo
 * (D-113, CA-32.13): van en barras chicas debajo de la principal, por
 * vencimiento. Incluye las que ya cumplieron su plazo y falta declarar. No
 * incluye la de la barra principal (`shownId`) ni las declaradas.
 */
export function otherPrescriptionAlerts(
    c: Pick<Case, 'legalQualifications'>,
    shownId: number | null,
): CaseLegalQualification[] {
    return c.legalQualifications
        .filter((q) => q.prescriptionDeclaration === null && q.alert && q.id !== shownId)
        .sort(byExpiry)
}

function byExpiry(a: CaseLegalQualification, b: CaseLegalQualification): number {
    return a.prescriptionExpiresOn.localeCompare(b.prescriptionExpiresOn) || a.id - b.id
}

/**
 * La nota al pie de la barra: desde cuándo corre el cómputo —el último acto
 * interruptivo que la reinició o la fecha del hecho (V4 D-49, D-113)— y cuál
 * calificación se muestra: con varias, la que prescribe primero; si es la
 * próxima porque la que rige ya cumplió su plazo, lo dice (D-112).
 */
export function prescriptionNote(
    c: Pick<Case, 'legalQualifications'>,
    shown: Exclude<ShownPrescription, { kind: 'allExpired' }>,
): string {
    const { lastInterruptiveActDate, legalQualificationName } = shown.prescription
    const base = lastInterruptiveActDate
        ? `Cómputo reiniciado por el acto interruptivo registrado el ${formatDate(lastInterruptiveActDate)}.`
        : 'Sin actos interruptivos registrados: el cómputo corre desde la fecha del hecho.'
    if (shown.kind === 'next') {
        return `${base} Próximo a prescribir: ${legalQualificationName}.`
    }
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
 * cuenta que hace el backend (V3 D-19;
 * `backend/src/subsystems/cases/core/domain/prescription.ts`). Devuelve `YYYY-MM-DD`, o `null` si
 * todavía no se cargó la fecha.
 */
export function estimatedExpiry(offenseDate: string, months: number): string | null {
    const start = parseDateOnly(offenseDate)
    if (!start) return null
    /* Si el mes de destino es más corto, el día se queda en el último de ese
       mes: 31/08 más seis meses es 28/02, no 03/03. Es la cuenta del backend
       (`addPrescriptionMonths`); `new Date(año, mes, 31)` a secas se pasa al
       mes siguiente y el resumen mostraba una fecha que después no era la de
       la causa. */
    const month = start.getMonth() + months
    const lastDay = new Date(start.getFullYear(), month + 1, 0).getDate()
    const end = new Date(start.getFullYear(), month, Math.min(start.getDate(), lastDay))
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
