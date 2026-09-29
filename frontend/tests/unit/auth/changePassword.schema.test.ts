import { describe, expect, it } from 'vitest'
import {
    MIN_PASSWORD_LENGTH,
    validateChangePassword,
} from '@/features/auth/schemas/changePassword.schema'
import type { ChangePasswordFormValues } from '@/features/auth/types/credentials'

const VALID: ChangePasswordFormValues = {
    currentPassword: 'password1',
    newPassword: 'nueva2026',
    repeatPassword: 'nueva2026',
}

describe('validateChangePassword', () => {
    it('no devuelve errores con valores válidos', () => {
        expect(validateChangePassword(VALID)).toEqual({})
    })

    it('marca los tres campos si el formulario está vacío', () => {
        expect(
            validateChangePassword({ currentPassword: '', newPassword: '', repeatPassword: '' }),
        ).toEqual({
            currentPassword: 'La contraseña actual es obligatoria.',
            newPassword: 'La contraseña nueva es obligatoria.',
            repeatPassword: 'Repetí la contraseña nueva.',
        })
    })

    it(`rechaza una contraseña nueva de menos de ${MIN_PASSWORD_LENGTH} caracteres`, () => {
        const errors = validateChangePassword({ ...VALID, newPassword: 'abc1', repeatPassword: 'abc1' })
        expect(errors.newPassword).toBe('La contraseña no cumple con los requisitos establecidos.')
    })

    it('rechaza una contraseña nueva sin ningún número', () => {
        const errors = validateChangePassword({
            ...VALID,
            newPassword: 'sinnumeros',
            repeatPassword: 'sinnumeros',
        })
        expect(errors.newPassword).toBe('La contraseña no cumple con los requisitos establecidos.')
    })

    it(`acepta una contraseña de exactamente ${MIN_PASSWORD_LENGTH} caracteres con un número`, () => {
        const errors = validateChangePassword({
            ...VALID,
            newPassword: 'abcdefg1',
            repeatPassword: 'abcdefg1',
        })
        expect(errors).toEqual({})
    })

    it('rechaza que la nueva sea igual a la actual', () => {
        const errors = validateChangePassword({
            currentPassword: 'password1',
            newPassword: 'password1',
            repeatPassword: 'password1',
        })
        expect(errors.newPassword).toBe('La contraseña nueva tiene que ser distinta de la actual.')
    })

    it('marca la repetición si no coincide con la nueva', () => {
        const errors = validateChangePassword({ ...VALID, repeatPassword: 'otra2026' })
        expect(errors).toEqual({ repeatPassword: 'Las contraseñas nuevas no coinciden.' })
    })

    it('no recorta: un espacio al final hace que la repetición no coincida', () => {
        const errors = validateChangePassword({ ...VALID, repeatPassword: 'nueva2026 ' })
        expect(errors.repeatPassword).toBe('Las contraseñas nuevas no coinciden.')
    })
})
