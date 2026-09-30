import { describe, expect, it } from 'vitest'
import { isValid, validateLawyer } from '@/features/lawyers/schemas/lawyer.schema'

describe('validateLawyer', () => {
    it('no devuelve errores con nombre y matrícula válidos', () => {
        expect(validateLawyer({ fullName: 'Dra. Ana Pérez', registrationNumber: '1-28114' })).toEqual({})
    })

    it('marca los dos campos si están vacíos', () => {
        expect(validateLawyer({ fullName: '', registrationNumber: '' })).toEqual({
            fullName: 'El apellido y nombre es obligatorio.',
            registrationNumber: 'La matrícula es obligatoria.',
        })
    })

    it('trata un nombre de puros espacios como vacío', () => {
        expect(validateLawyer({ fullName: '   ', registrationNumber: '1-28114' }).fullName).toBe(
            'El apellido y nombre es obligatorio.',
        )
    })

    it('acepta dos dígitos de circunscripción', () => {
        expect(validateLawyer({ fullName: 'Ana Pérez', registrationNumber: '12-28114' })).toEqual({})
    })

    it('recorta los espacios de la matrícula antes de validarla', () => {
        expect(validateLawyer({ fullName: 'Ana Pérez', registrationNumber: '  1-28114  ' })).toEqual({})
    })

    it.each([
        ['sin guión', '128114'],
        ['número de 4 dígitos', '1-2811'],
        ['número de 6 dígitos', '1-281140'],
        ['circunscripción de 3 dígitos', '123-28114'],
        ['con letras', 'MP-28114'],
    ])('rechaza una matrícula %s (%s)', (_caso, registrationNumber) => {
        expect(validateLawyer({ fullName: 'Ana Pérez', registrationNumber }).registrationNumber).toBe(
            'El formato es circunscripción y número: 1-28114.',
        )
    })
})

describe('isValid', () => {
    it('es true sin errores y false con alguno', () => {
        expect(isValid({})).toBe(true)
        expect(isValid({ fullName: 'error' })).toBe(false)
    })
})
