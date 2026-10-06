import { describe, expect, it } from 'vitest'
import { isValid, validateLegalQualification } from '@/features/legal-params/schemas/legalQualification.schema'
import type { LegalQualificationFormValues } from '@/features/legal-params/types/legalQualification'

const VALID: LegalQualificationFormValues = { name: 'Hurto simple — art. 162 CP', years: '2', months: '0' }

describe('validateLegalQualification', () => {
    it('acepta un alta completa', () => {
        expect(isValid(validateLegalQualification(VALID))).toBe(true)
    })

    it('pide el nombre y no deja pasar de 255 caracteres', () => {
        expect(validateLegalQualification({ ...VALID, name: '  ' }).name)
            .toBe('El nombre de la calificación es obligatorio.')
        expect(validateLegalQualification({ ...VALID, name: 'a'.repeat(256) }).name)
            .toBe('Puede tener hasta 255 caracteres.')
        expect(validateLegalQualification({ ...VALID, name: 'a'.repeat(255) }).name).toBeUndefined()
    })

    it('pide los años, enteros', () => {
        expect(validateLegalQualification({ ...VALID, years: '' }).years)
            .toBe('Los años son obligatorios. Si el plazo es menor a un año, poné 0.')
        expect(validateLegalQualification({ ...VALID, years: '6.5' }).years)
            .toBe('Los años deben ser un número entero. Para medio año usá el campo Meses.')
        expect(validateLegalQualification({ ...VALID, years: '-1' }).years)
            .toBe('Los años deben ser un número entero. Para medio año usá el campo Meses.')
    })

    it('el plazo es de al menos un mes', () => {
        expect(validateLegalQualification({ ...VALID, years: '0', months: '0' }).years)
            .toBe('El plazo tiene que ser de al menos un mes.')
        expect(isValid(validateLegalQualification({ ...VALID, years: '0', months: '6' }))).toBe(true)
    })
})
