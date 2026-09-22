import type { ChangePasswordFormValues } from '@/features/auth/types/credentials'

/** Un mensaje por campo con problema. Objeto vacío = el formulario está bien. */
export type ChangePasswordErrors = Partial<Record<keyof ChangePasswordFormValues, string>>

/** Largo mínimo de la contraseña nueva, según el contrato (§3.1). */
export const MIN_PASSWORD_LENGTH = 8

/** El contrato pide además al menos un número. */
const RE_HAS_DIGIT = /\d/

/**
 * Validación del formulario de cambio de contraseña.
 *
 * Función pura, sin React. Es la primera barrera, no la única: el backend
 * valida lo mismo y responde 400 con los errores campo por campo.
 */
export function validateChangePassword(
    values: ChangePasswordFormValues,
): ChangePasswordErrors {
    const errors: ChangePasswordErrors = {}

    // Las contraseñas no se recortan: un espacio puede ser parte de la clave.
    if (values.currentPassword === '') {
        errors.currentPassword = 'La contraseña actual es obligatoria.'
    }

    if (values.newPassword === '') {
        errors.newPassword = 'La contraseña nueva es obligatoria.'
    } else if (
        values.newPassword.length < MIN_PASSWORD_LENGTH ||
        !RE_HAS_DIGIT.test(values.newPassword)
    ) {
        // Mismo texto que el 400 del contrato: la regla completa ya está
        // escrita arriba del formulario, así que el error no la repite.
        errors.newPassword = 'La contraseña no cumple con los requisitos establecidos.'
    } else if (values.newPassword === values.currentPassword) {
        /* Regla sólo de pantalla: el contrato no la pide. Cambiar la
           contraseña por la misma que ya se tenía no es un error del servidor,
           pero tampoco es lo que la persona quiso hacer. */
        errors.newPassword = 'La contraseña nueva tiene que ser distinta de la actual.'
    }

    /* También sólo de pantalla: el campo de repetición no existe en el
       contrato. Está para que nadie se cambie la contraseña por una que
       escribió mal y después no pueda entrar. */
    if (values.repeatPassword === '') {
        errors.repeatPassword = 'Repetí la contraseña nueva.'
    } else if (values.newPassword !== values.repeatPassword) {
        errors.repeatPassword = 'Las contraseñas nuevas no coinciden.'
    }

    return errors
}
