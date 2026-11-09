import { describe, expect, it } from 'vitest'
import { validateCaseFile } from '@/features/cases/schemas/caseFile.schema'

const EMPTY = { opposingParty: '', notes: '' }

/**
 * CA-25.2 y CA-25.5: al menos un documento, y los dos textos de la carátula
 * hasta 500 caracteres (V5 §3.12). El servidor lo vuelve a controlar.
 */
describe('validateCaseFile', () => {
    it('con un documento y sin textos no hay error', () => {
        expect(validateCaseFile(EMPTY, ['a'])).toEqual({})
    })

    it('sin documentos pide al menos uno (CA-25.2)', () => {
        expect(validateCaseFile(EMPTY, [])).toEqual({ documentIds: 'Elegí al menos un documento.' })
    })

    it('500 caracteres se aceptan, y los espacios de los bordes no cuentan (CA-25.5)', () => {
        const text = `  ${'a'.repeat(500)}  `
        expect(validateCaseFile({ opposingParty: text, notes: text }, ['a'])).toEqual({})
    })

    it('con más de 500 caracteres marca cada campo (CA-25.5)', () => {
        const text = 'a'.repeat(501)
        expect(validateCaseFile({ opposingParty: text, notes: text }, ['a'])).toEqual({
            opposingParty: 'Puede tener hasta 500 caracteres.',
            notes: 'Puede tener hasta 500 caracteres.',
        })
    })
})
