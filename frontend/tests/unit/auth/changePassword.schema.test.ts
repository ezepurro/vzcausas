import { describe, expect, it } from 'vitest'
import { validateChangePassword } from '@/features/auth/schemas/changePassword.schema'
import type { ChangePasswordFormValues } from '@/features/auth/types/credentials'

const VALID: ChangePasswordFormValues = {
    currentPassword: 'password1',
    newPassword: 'nueva2026',
    repeatPassword: 'nueva2026',
}

describe('validateChangePassword', () => {
    it('rechaza una contraseña nueva sin ningún número', () => {
        const errors = validateChangePassword({
            ...VALID,
            newPassword: 'sinnumeros',
            repeatPassword: 'sinnumeros',
        })
        expect(errors.newPassword).toBe('La contraseña no cumple con los requisitos establecidos.')
    })

    it('rechaza que la nueva sea igual a la actual', () => {
        const errors = validateChangePassword({
            currentPassword: 'password1',
            newPassword: 'password1',
            repeatPassword: 'password1',
        })
        expect(errors.newPassword).toBe('La contraseña nueva tiene que ser distinta de la actual.')
    })
})
