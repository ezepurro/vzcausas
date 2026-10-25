import { describe, expect, it } from 'vitest'
import { toFormErrors } from '@/features/lawyers/utils/toFormErrors'

describe('toFormErrors (abogado)', () => {
    it('pasa los campos del formulario', () => {
        expect(toFormErrors({ registrationNumber: 'El formato de la matrícula no es válido.' })).toEqual({
            registrationNumber: 'El formato de la matrícula no es válido.',
        })
    })

    it('descarta las claves que el formulario no pinta', () => {
        expect(toFormErrors({ fullName: 'property fullName should not exist' })).toEqual({})
        expect(toFormErrors(null)).toEqual({})
    })
})
