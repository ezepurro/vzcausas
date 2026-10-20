import { describe, expect, it } from 'vitest'
import { toFormErrors } from '@/features/users/utils/toFormErrors'

describe('toFormErrors (usuario)', () => {
    it('pasa los campos que se llaman igual', () => {
        expect(toFormErrors({ username: 'El nombre de usuario no cumple con el formato requerido.' })).toEqual({
            username: 'El nombre de usuario no cumple con el formato requerido.',
        })
    })

    it('el error de los roles va en la última casilla de perfil, como en la validación', () => {
        expect(toFormErrors({ roles: 'Debe tener al menos un rol.' })).toEqual({ roleSecretary: 'Debe tener al menos un rol.' })
    })

    it('el error de la ficha nueva, anidado en lawyer, va a la matrícula', () => {
        expect(toFormErrors({ 'lawyer.registrationNumber': 'El formato de la matrícula no es válido.' })).toEqual({
            registrationNumber: 'El formato de la matrícula no es válido.',
        })
    })

    it('si el usuario y su ficha fallan en el mismo campo, gana el del usuario', () => {
        expect(toFormErrors({ lastName: 'El apellido es obligatorio.', 'lawyer.lastName': 'Es obligatorio.' })).toEqual({
            lastName: 'El apellido es obligatorio.',
        })
    })

    it('descarta las claves que el formulario no pinta', () => {
        expect(toFormErrors({ active: 'property active should not exist' })).toEqual({})
        expect(toFormErrors(null)).toEqual({})
    })
})
