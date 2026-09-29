import { describe, expect, it } from 'vitest'
import { isCreatingLawyer, lawyerOptionLabel, needsLawyer } from '@/features/users/utils/lawyerLink'
import { LAWYER_MODES } from '@/features/users/types/user'

describe('needsLawyer', () => {
    it('es true si los roles incluyen abogado', () => {
        expect(needsLawyer(['LAWYER'])).toBe(true)
        expect(needsLawyer(['ADMINISTRATOR', 'LAWYER'])).toBe(true)
        expect(needsLawyer(['SECRETARY', 'LAWYER'])).toBe(true)
    })

    it('es false sin el rol abogado', () => {
        expect(needsLawyer(['SECRETARY'])).toBe(false)
        expect(needsLawyer(['ADMINISTRATOR'])).toBe(false)
        expect(needsLawyer([])).toBe(false)
    })
})

describe('isCreatingLawyer', () => {
    it('reconoce el modo "registrar un abogado nuevo"', () => {
        expect(isCreatingLawyer(LAWYER_MODES.create)).toBe(true)
    })

    it('el modo vincular y cualquier otro texto no son alta', () => {
        expect(isCreatingLawyer(LAWYER_MODES.link)).toBe(false)
        expect(isCreatingLawyer('')).toBe(false)
    })
})

describe('lawyerOptionLabel', () => {
    it('junta el nombre y la matrícula', () => {
        expect(
            lawyerOptionLabel({ id: 3, fullName: 'Dra. Malena Ríos', registrationNumber: '1-36842' }),
        ).toBe('Dra. Malena Ríos · matrícula 1-36842')
    })
})
