import { describe, expect, it } from 'vitest'
import { isValid, validateLegalQualification } from '@/features/legal-params/schemas/legalQualification.schema'
import type { LegalQualificationFormValues } from '@/features/legal-params/types/legalQualification'

const VALID: LegalQualificationFormValues = { name: 'Hurto simple — art. 162 CP', years: '2', months: '0' }

describe('validateLegalQualification', () => {
    it('el plazo es de al menos un mes', () => {
        expect(validateLegalQualification({ ...VALID, years: '0', months: '0' }).years)
            .toBe('El plazo tiene que ser de al menos un mes.')
        expect(isValid(validateLegalQualification({ ...VALID, years: '0', months: '6' }))).toBe(true)
    })
})
