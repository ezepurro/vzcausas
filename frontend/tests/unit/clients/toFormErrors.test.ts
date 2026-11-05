import { describe, expect, it } from 'vitest'
import { toFormErrors } from '@/features/clients/utils/toFormErrors'

describe('toFormErrors (cliente)', () => {
    it('pasa los campos del formulario', () => {
        expect(
            toFormErrors({
                documentType: 'El tipo de documento no es válido.',
                documentNumber: 'Entre 7 y 8 dígitos.',
                address: 'Hasta 255 caracteres.',
                email: 'No es un correo válido.',
            }),
        ).toEqual({
            documentType: 'El tipo de documento no es válido.',
            documentNumber: 'Entre 7 y 8 dígitos.',
            address: 'Hasta 255 caracteres.',
            email: 'No es un correo válido.',
        })
    })

    it('descarta las claves que el formulario no pinta', () => {
        expect(toFormErrors({ clientSince: 'property clientSince should not exist' })).toEqual({})
        expect(toFormErrors(null)).toEqual({})
    })
})
