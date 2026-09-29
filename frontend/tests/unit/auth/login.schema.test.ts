import { describe, expect, it } from 'vitest'
import { validateLogin } from '@/features/auth/schemas/login.schema'

describe('validateLogin', () => {
    it('no devuelve errores si los dos campos están completos', () => {
        expect(validateLogin({ username: 'fvazquez', password: 'password1' })).toEqual({})
    })

    it('marca los dos campos si el formulario está vacío', () => {
        expect(validateLogin({ username: '', password: '' })).toEqual({
            username: 'El nombre de usuario es obligatorio.',
            password: 'La contraseña es obligatoria.',
        })
    })

    it('marca el usuario si sólo tiene espacios', () => {
        expect(validateLogin({ username: '   ', password: 'password1' })).toEqual({
            username: 'El nombre de usuario es obligatorio.',
        })
    })

    it('no recorta la contraseña: un espacio es una clave válida', () => {
        expect(validateLogin({ username: 'fvazquez', password: ' ' })).toEqual({})
    })

    it('no exige formato ni largo: esas reglas las pone el servidor', () => {
        expect(validateLogin({ username: 'a', password: 'x' })).toEqual({})
    })
})
