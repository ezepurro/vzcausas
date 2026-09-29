/**
 * Lo que se manda al servidor y lo que se escribe en los formularios.
 *
 * Están separados a propósito: no es lo mismo el cuerpo de la petición que
 * los valores de la pantalla. El formulario de cambio de contraseña, por
 * ejemplo, tiene un campo de repetición que nunca viaja.
 */

/* ---------------- iniciar sesión ---------------- */

/** Cuerpo de `POST /auth/login`. */
export interface LoginBody {
    username: string
    password: string
}

/**
 * Valores del formulario de login. Sólo `string`, que es lo que admite
 * `FormValues` de `FormModal`, y nunca `undefined`.
 *
 * Va como `type` y no como `interface` para que sea asignable a
 * `FormValues`, que es un `Record<string, string | boolean>`: una interfaz no
 * lo es.
 */
export type LoginFormValues = {
    username: string
    password: string
}

/* ---------------- cambiar contraseña ---------------- */

/** Cuerpo de `PATCH /auth/password`. */
export interface ChangePasswordBody {
    currentPassword: string
    newPassword: string
}

/**
 * Valores del formulario de cambio de contraseña.
 *
 * `repeatPassword` es de la pantalla, no del contrato: sirve para que nadie
 * se cambie la contraseña por una que escribió mal. Nunca se manda.
 */
export type ChangePasswordFormValues = {
    currentPassword: string
    newPassword: string
    repeatPassword: string
}
