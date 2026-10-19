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
/* Apellido y nombres, cada uno hasta 100 caracteres (V4 §3.2, D-68). */
const NAME_MAX = 100

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

    const lastName = values.lastName.trim()
    if (!lastName) {
        errors.lastName = 'El apellido es obligatorio.'
    } else if (lastName.length > NAME_MAX) {
        errors.lastName = `Puede tener hasta ${NAME_MAX} caracteres.`
    }

    const firstName = values.firstName.trim()
    if (!firstName) {
        errors.firstName = 'Los nombres son obligatorios.'
    } else if (firstName.length > NAME_MAX) {
        errors.firstName = `Puede tener hasta ${NAME_MAX} caracteres.`
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

    /* El error es del grupo, no de un perfil: se cuelga del último tilde para
       que se lea justo debajo de los tres. Los tres specs de `UserFormModal`
       pasan `error`, así que cualquiera de ellos sabría dibujarlo. */
    if (ctx.roles.length === 0) {
        errors.roleSecretary = 'Elegí al menos un perfil.'
    }

    Object.assign(errors, validateLawyerLink(values, ctx))

    return errors
}

/**
 * El vínculo con la ficha profesional.
 *
 * Hace falta ficha **sólo con perfil Abogado**. El contrato es explícito:
 * "un usuario con rol ADMINISTRATOR o SECRETARY que no ejerce no posee
 * matrícula". Cuál de los dos caminos se valida lo decide el modo elegido,
 * que es el mismo `lawyerId` / `lawyer` del contrato con otro nombre.
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

    /* La ficha nueva toma el apellido y los nombres del usuario, que ya se
       validaron arriba: acá sólo falta la matrícula. */
    const errors: UserFormErrors = {}

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
