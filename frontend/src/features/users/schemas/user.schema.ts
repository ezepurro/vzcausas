/**
 * Validación del formulario de usuario.
 * El backend las vuelve a verificar: validar acá es para no gastar un viaje al servidor y para decir
 * qué campo está mal, no para reemplazarlo.
 */

import type { Role, UserFormValues } from '@/features/users/types/user'
import { isCreatingLawyer, needsLawyer } from '@/features/users/utils/lawyerLink'

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>

export interface UserValidationContext {
    /** En la edición no se pide contraseña: eso va por `PATCH /auth/password`. */
    mode: 'create' | 'edit'
    /** Los roles ya traducidos de los rótulos del select. La traducción la hace `utils/`. */
    roles: Role[]
}

/* Formato de usuario y contraseña, tal como los fija el contrato. */
const USERNAME_MIN = 3
const USERNAME_MAX = 30
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/
const PASSWORD_MIN = 8

/* Un punto, una arroba y algo después. No es la gramática completa del RFC a
   propósito: la validación de verdad la hace el backend, y un patrón más
   estricto rechaza correos legítimos. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* Matrícula de Abogados de Córdoba(MP MATRICULA PROFESIONAL) */
const REGISTRATION_PATTERN = /^\d{1,2}-\d{5}$/

export function validateUser(
    values: UserFormValues,
    ctx: UserValidationContext,
): UserFormErrors {
    const errors: UserFormErrors = {}

    if (!values.fullName.trim()) {
        errors.fullName = 'El nombre y apellido es obligatorio.'
    }

    const username = values.username.trim()
    if (!username) {
        errors.username = 'El nombre de usuario es obligatorio.'
    } else if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
        errors.username = `Debe tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`
    } else if (!USERNAME_PATTERN.test(username)) {
        errors.username = 'Sólo se admiten letras, números, punto, guión y guión bajo.'
    }

    const email = values.email.trim()
    if (!email) {
        errors.email = 'El correo electrónico es obligatorio.'
    } else if (!EMAIL_PATTERN.test(email)) {
        errors.email = 'El formato del correo electrónico no es válido.'
    }

    if (ctx.mode === 'create') {
        const password = values.password
        if (!password) {
            errors.password = 'La contraseña es obligatoria.'
        } else if (password.length < PASSWORD_MIN) {
            errors.password = `Debe tener al menos ${PASSWORD_MIN} caracteres.`
        } else if (!/\d/.test(password)) {
            errors.password = 'Debe incluir al menos un número.'
        }

        /* Se compara sin recortar: si la contraseña lleva un espacio al
           final, la repetición tiene que llevarlo también. */
        if (!values.passwordConfirm) {
            errors.passwordConfirm = 'Repetí la contraseña.'
        } else if (values.passwordConfirm !== password) {
            errors.passwordConfirm = 'Las dos contraseñas no coinciden.'
        }
    }

    /* El error va en el primer tilde porque es el único de los tres que
       tiene dónde dibujarlo. */
    if (ctx.roles.length === 0) {
        errors.roleSecretary = 'Elegí al menos un perfil.'
    }

    Object.assign(errors, validateLawyerLink(values, ctx))

    return errors
}

/**
 * El vínculo con la ficha profesional.
 *
 * Con perfil Administrador o Abogado hace falta una ficha; con Secretaría no
 * corresponde ninguna. Cuál de los dos caminos se valida lo decide el modo
 * elegido, que es el mismo `lawyerId` / `lawyer` del contrato con otro
 * nombre.
 */
function validateLawyerLink(
    values: UserFormValues,
    ctx: UserValidationContext,
): UserFormErrors {
    if (!needsLawyer(ctx.roles)) return {}

    /* En la edición sólo se vincula una ficha existente: dar de alta una
       nueva es `POST /lawyers`, otra pantalla. */
    if (ctx.mode === 'edit' || !isCreatingLawyer(values.lawyerMode)) {
        return values.lawyerId.trim()
            ? {}
            : { lawyerId: 'Este perfil necesita una ficha de abogado vinculada.' }
    }

    const errors: UserFormErrors = {}

    if (!values.lawyerFullName.trim()) {
        errors.lawyerFullName = 'El nombre y apellido del abogado es obligatorio.'
    }

    const registrationNumber = values.registrationNumber.trim()
    if (!registrationNumber) {
        errors.registrationNumber = 'La matrícula es obligatoria.'
    } else if (!REGISTRATION_PATTERN.test(registrationNumber)) {
        errors.registrationNumber = 'El formato es circunscripción y número: 1-28114.'
    }

    return errors
}

/** `true` si no hay ningún error. Evita repetir el `Object.keys` en la pantalla. */
export function isValid(errors: UserFormErrors): boolean {
    return Object.keys(errors).length === 0
}
