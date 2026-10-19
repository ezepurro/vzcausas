import { JURISDICTION_LABELS, JURISDICTIONS, type Jurisdiction } from '@/features/legal-params'
import type { DocumentTemplate } from '@/features/documents/types/documentTemplate'

/** Lo que dice cada tarjeta de fuero bajo su nombre (prototipo). */
export const JURISDICTION_DESCRIPTIONS: Record<Jurisdiction, string> = {
    CRIMINAL: 'Defensa técnica, recursos y pedidos en la instrucción y el juicio.',
    ADMINISTRATIVE: 'Descargos, recursos y presentaciones en la vía administrativa.',
    AMPARO: 'Demandas de amparo, medidas cautelares y presentaciones conexas.',
}

/**
 * El día de una fecha con hora del contrato: "2026-08-21T17:40:00-03:00" →
 * "2026-08-21", para pasarlo por `formatDate`. El backend la manda con el
 * desfase de Córdoba, así que los diez primeros caracteres ya son el día
 * local. No se usa `new Date(...)` para no correr el día.
 */
export function versionDay(isoDateTime: string): string {
    return isoDateTime.slice(0, 10)
}

/** "1 modelo", "6 modelos". */
export function countLabel(n: number, singular: string, plural: string): string {
    return `${n} ${n === 1 ? singular : plural}`
}

/** El peso de un archivo elegido: "820 bytes", "48 KB", "2,4 MB". */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export interface JurisdictionSummary {
    jurisdiction: Jurisdiction
    count: number
    /** `YYYY-MM-DD` de la última versión cargada, o `null` si no hay modelos */
    lastUpdatedOn: string | null
}

/**
 * Las tarjetas de la vista general (CA-35.4, CA-35.11). Las arma el cliente
 * a partir del listado sin filtro (D-57). Un modelo de varios fueros cuenta
 * en cada uno (CA-35.2).
 */
export function summarizeByJurisdiction(templates: readonly DocumentTemplate[]): JurisdictionSummary[] {
    return JURISDICTIONS.map((jurisdiction) => {
        const own = templates.filter((t) => t.jurisdictions.includes(jurisdiction))
        const days = own.map((t) => versionDay(t.lastVersionAt)).sort()
        return {
            jurisdiction,
            count: own.length,
            lastUpdatedOn: days.length > 0 ? days[days.length - 1] : null,
        }
    })
}

/** "el fuero Penal", "los fueros Penal y Amparo", "todos los fueros". */
export function jurisdictionsPhrase(jurisdictions: readonly Jurisdiction[]): string {
    const labels = JURISDICTIONS.filter((j) => jurisdictions.includes(j)).map((j) => JURISDICTION_LABELS[j])
    if (labels.length === JURISDICTIONS.length) return 'todos los fueros'
    if (labels.length === 1) return `el fuero ${labels[0]}`
    return `los fueros ${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`
}
