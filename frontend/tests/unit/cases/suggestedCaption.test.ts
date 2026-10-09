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
    it('sin cliente no hay nada que sugerir', () => {
        expect(suggestedCaption({ ...base, clientName: null })).toBeNull()
    })

    describe('fuero penal', () => {
        it('es el cliente, "p.s.a." y las calificaciones', () => {
            expect(suggestedCaption({ ...base, qualificationNames: ['Robo calificado'] })).toBe(
                `${GOMEZ} p.s.a. Robo calificado`,
            )
        })

        it('con varias calificaciones las une con "y"', () => {
            expect(suggestedCaption({ ...base, qualificationNames: ['Lesiones graves', 'Amenazas coactivas'] })).toBe(
                `${GOMEZ} p.s.a. Lesiones graves y Amenazas coactivas`,
            )
        })

        it('sin calificaciones deja el lugar marcado', () => {
            expect(suggestedCaption(base)).toBe(`${GOMEZ} p.s.a. …`)
        })

        it('no usa la contraparte, que no es de este fuero', () => {
            expect(suggestedCaption({ ...base, qualificationNames: ['Hurto simple'], counterparty: 'APROSS' })).toBe(
                `${GOMEZ} p.s.a. Hurto simple`,
            )
        })
    })

    describe('fuero de amparo', () => {
        it('es el cliente contra la contraparte', () => {
            expect(suggestedCaption({ ...base, jurisdiction: 'AMPARO', counterparty: 'APROSS' })).toBe(
                `${GOMEZ} c/ APROSS — Amparo`,
            )
        })

        it('sin contraparte deja el lugar marcado', () => {
            expect(suggestedCaption({ ...base, jurisdiction: 'AMPARO' })).toBe(`${GOMEZ} c/ … — Amparo`)
            expect(suggestedCaption({ ...base, jurisdiction: 'AMPARO', counterparty: '   ' })).toBe(`${GOMEZ} c/ … — Amparo`)
        })
    })

    describe('fuero administrativo', () => {
        it('es el cliente, el organismo y "Sumario administrativo"', () => {
            expect(
                suggestedCaption({ ...base, jurisdiction: 'ADMINISTRATIVE', counterparty: 'Tribunal de Conducta' }),
            ).toBe(`${GOMEZ} — Tribunal de Conducta · Sumario administrativo`)
        })

        it('sin organismo queda sólo el sumario', () => {
            expect(suggestedCaption({ ...base, jurisdiction: 'ADMINISTRATIVE' })).toBe(`${GOMEZ} — Sumario administrativo`)
        })
    })
})
