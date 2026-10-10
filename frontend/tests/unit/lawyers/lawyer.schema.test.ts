import { describe, expect, it } from 'vitest'
import { validateLawyer } from '@/features/lawyers/schemas/lawyer.schema'

describe('validateLawyer', () => {
    it('acepta dos dígitos de circunscripción', () => {
        expect(validateLawyer({ fullName: 'Ana Pérez', registrationNumber: '12-28114' })).toEqual({})
    })

    it('recorta los espacios de la matrícula antes de validarla', () => {
        expect(validateLawyer({ fullName: 'Ana Pérez', registrationNumber: '  1-28114  ' })).toEqual({})
    })

    it.each([
        ['sin guión', '128114'],
    ])('rechaza una matrícula %s (%s)', (_caso, registrationNumber) => {
        expect(validateLawyer({ fullName: 'Ana Pérez', registrationNumber }).registrationNumber).toBe(
            'El formato es circunscripción y número: 1-28114.',
        )
    })
})
