/**
 * Validación del formulario de usuario. 
 * Funciones puras: entran los valores,
 * sale un error por campo. El día que entre `zod` cambia el interior de este
 * archivo y no su ubicación ni su firma.
 */

import type { Role, UserFormValues } from '@/features/users/types/user'

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>

export interface UserValidationContext {
    /** En la edición no se pide contraseña: eso va por `PATCH /auth/password`. */
    mode: 'create' | 'edit'
    /** El rol ya traducido del rótulo del select. La traducción la hace `utils/`. */
    role: Role | null
}

/* Formato de usuario y contraseña. OJO: estas reglas NO están en el
    contrato, las definió el mock para llenar el hueco (ver su README,
    "Huecos que el mock tuvo que completar"). Si el backend define otras,
   se cambian acá. */
const USERNAME_MIN = 3
const USERNAME_MAX = 30
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/
const PASSWORD_MIN = 8

export function validateUser(
    values: UserFormValues,
    ctx: UserValidationContext,
): UserFormErrors {
    const errors: UserFormErrors = {}

    const username = values.username.trim()
    if (!username) {
        errors.username = 'El nombre de usuario es obligatorio.'
    } else if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
        errors.username = `Debe tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`
    } else if (!USERNAME_PATTERN.test(username)) {
        errors.username = 'Sólo se admiten letras, números, punto, guión y guión bajo.'
    }

    if (ctx.mode === 'create') {
        const password = values.password
        if (!password) {
            errors.password = 'La contraseña es obligatoria.'
        } else if (password.length < PASSWORD_MIN) {
            errors.password = `Debe tener al menos ${PASSWORD_MIN} caracteres.`
        } else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
            errors.password = 'Debe combinar letras y números.'
        }
    }

    if (!ctx.role) {
        errors.role = 'Elegí un perfil.'
    }

    /* Un usuario con rol LAWYER necesita un abogado que exista: sin eso el
        alta responde 422. Lo chequeamos acá para no gastar un viaje al
       servidor, pero la regla es del backend y él la vuelve a verificar. */
    if (ctx.role === 'LAWYER' && !values.abogadoId.trim()) {
        errors.abogadoId = 'Un usuario con perfil Abogado necesita un abogado vinculado.'
    }

    return errors
}

/** `true` si no hay ningún error. Evita repetir el `Object.keys` en la pantalla. */
export function isValid(errors: UserFormErrors): boolean {
    return Object.keys(errors).length === 0
}
