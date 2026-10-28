import { describe, expect, it } from 'vitest'
import { captionWithClient, suggestedCaption, type CaptionInput } from '@/features/cases/utils/suggestedCaption'

/**
 * CA-18.11: la interfaz sugiere la carátula con el cliente y las calificaciones
 * o la contraparte. Las tres formas salen del prototipo; el usuario la puede
 * ajustar, y lo que se registra es la carátula final.
 */

const GOMEZ = 'GÓMEZ, Ariel Fernando'

const base: CaptionInput = {
    jurisdiction: 'CRIMINAL',
    clientName: GOMEZ,
    qualificationNames: [],
    counterparty: '',
}

describe('suggestedCaption', () => {
    describe('fuero penal', () => {
        it('es el cliente, "p.s.a." y las calificaciones', () => {
            expect(suggestedCaption({ ...base, qualificationNames: ['Robo calificado'] })).toBe(
                `${GOMEZ} p.s.a. Robo calificado`,
            )
        })
    })

    describe('fuero de amparo', () => {
        it('es el cliente contra la contraparte', () => {
            expect(suggestedCaption({ ...base, jurisdiction: 'AMPARO', counterparty: 'APROSS' })).toBe(
                `${GOMEZ} c/ APROSS — Amparo`,
            )
        })
    })
})

/**
 * CA-19.7 (D-105): al cambiar el cliente en "Modificar causa", la carátula se
 * propone con el cliente nuevo y conserva el resto, como el prototipo.
 */
describe('captionWithClient', () => {
    const PEREYRA = 'PEREYRA, Marcos D.'

    it('en el penal cambia el cliente y conserva desde "p.s.a."', () => {
        expect(captionWithClient(`${GOMEZ} p.s.a. Robo calificado`, PEREYRA)).toBe(
            `${PEREYRA} p.s.a. Robo calificado`,
        )
    })

    it('en el amparo conserva desde "c/", aunque después venga " —"', () => {
        expect(captionWithClient('MOYANO, Daniela c/ APROSS — Amparo', PEREYRA)).toBe(
            `${PEREYRA} c/ APROSS — Amparo`,
        )
    })

    it('en el administrativo conserva desde " —"', () => {
        expect(captionWithClient('PÉREZ, Ana — Policía de la Provincia · Sumario administrativo', PEREYRA)).toBe(
            `${PEREYRA} — Policía de la Provincia · Sumario administrativo`,
        )
    })

    it('una carátula sin ninguna marca queda sólo con el cliente nuevo', () => {
        expect(captionWithClient('Causa escrita a mano', PEREYRA)).toBe(PEREYRA)
    })
})
