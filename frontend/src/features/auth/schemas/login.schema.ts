import type { LoginFormValues } from '@/features/auth/types/credentials'

/** Un mensaje por campo con problema. Objeto vacío = el formulario está bien. */
export type LoginErrors = Partial<Record<keyof LoginFormValues, string>>

/**
 * Validación del formulario de inicio de sesión.
 *
 * Función pura, sin React: entran los valores y salen los errores.
 *
 * Valida **sólo que los campos estén completos**, y nada más. En un login no
 * corresponde exigir un formato de usuario ni un largo de contraseña: esas
 * reglas las fija el servidor, y las contraseñas viejas siguen siendo válidas
 * aunque las reglas hayan cambiado después. Adelantarse acá dejaría afuera a
 * alguien que sí tiene la credencial correcta.
 *
 * Los textos son los mismos que devuelve el backend en su 400, así que la
 * pantalla se ve igual frene quien frene.
 */
export function validateLogin(values: LoginFormValues): LoginErrors {
    const errors: LoginErrors = {}

    if (values.username.trim() === '') {
        errors.username = 'El nombre de usuario es obligatorio.'
    }

    // La contraseña no se recorta: un espacio puede ser parte de la clave.
    if (values.password === '') {
        errors.password = 'La contraseña es obligatoria.'
    }

    return errors
}
