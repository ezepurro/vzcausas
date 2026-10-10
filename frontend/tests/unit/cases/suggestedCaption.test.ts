import { describe, expect, it } from 'vitest'
import { suggestedCaption, type CaptionInput } from '@/features/cases/utils/suggestedCaption'

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
