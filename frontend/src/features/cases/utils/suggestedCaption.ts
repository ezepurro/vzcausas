/**
 * La carátula que sugiere el alta de causa, armada como en el prototipo:
 *
 * - Penal: `GÓMEZ, Ariel Fernando p.s.a. Robo calificado y Hurto simple`
 * - Amparo: `MOYANO, Daniela c/ APROSS — Amparo`
 * - Administrativo: `PÉREZ, Ana — Policía de la Provincia · Sumario administrativo`
 *
 * Es sólo una sugerencia: el usuario la acepta con "Usar esta carátula" o
 * escribe otra, y al backend viaja la carátula final (V3 §3.7).
 */

import type { Jurisdiction } from '@/features/legal-params'

export interface CaptionInput {
    jurisdiction: Jurisdiction
    /** Ya formateado: `GÓMEZ, Ariel Fernando`. `null` si no hay cliente elegido. */
    clientName: string | null
    /** La parte de cada calificación antes del artículo: `Hurto simple`. */
    qualificationNames: string[]
    counterparty: string
}

/** Lo que va donde todavía falta un dato, para que se vea el hueco. */
const MISSING = '…'

/** `null` mientras no hay cliente: sin él no hay nada que sugerir. */
export function suggestedCaption(input: CaptionInput): string | null {
    if (!input.clientName) return null

    const counterparty = input.counterparty.trim()

    switch (input.jurisdiction) {
        case 'CRIMINAL': {
            const offenses = input.qualificationNames.length > 0
                ? input.qualificationNames.join(' y ')
                : MISSING
            return `${input.clientName} p.s.a. ${offenses}`
        }
        case 'AMPARO':
            return `${input.clientName} c/ ${counterparty || MISSING} — Amparo`
        case 'ADMINISTRATIVE':
            return `${input.clientName} — ${counterparty ? `${counterparty} · ` : ''}Sumario administrativo`
    }
}

