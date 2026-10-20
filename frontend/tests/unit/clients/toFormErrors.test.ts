import { describe, expect, it } from 'vitest'
import { toFormErrors } from '@/features/clients/utils/toFormErrors'

describe('toFormErrors (cliente)', () => {
    it('pasa los campos del formulario', () => {
        expect(toFormErrors({ dni: 'Entre 7 y 8 dígitos.', email: 'No es un correo válido.' })).toEqual({
            dni: 'Entre 7 y 8 dígitos.',
            email: 'No es un correo válido.',
        })
    })

    it('descarta las claves que el formulario no pinta', () => {
        expect(toFormErrors({ clientSince: 'property clientSince should not exist' })).toEqual({})
        expect(toFormErrors(null)).toEqual({})
    })
})
