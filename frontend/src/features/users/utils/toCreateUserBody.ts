/** Del formulario al cuerpo del `POST /users`. Función pura, sin React ni HTTP. */

import type {
    CreateUserBody,
    Role,
    UserFormValues,
} from '@/features/users/types/user'

/**
 * `role` llega ya traducido del rótulo del select: lo hace la página, que es
 * la misma que se lo pasa al schema. Así acá no hay que contemplar el caso
 * "el rótulo no era ninguno de los tres" — si llegaste hasta acá, validó.
 */
export function toCreateUserBody(values: UserFormValues, role: Role): CreateUserBody {
    const abogadoId = values.abogadoId.trim()

    return {
        username: values.username.trim(),
        /* La contraseña NO se recorta: un espacio al principio o al final es
           parte de la contraseña, no basura de tipeo. */
        password: values.password,
        role: [role],
        /* Vacío significa "no se mandó", no "se mandó vacío". */
        ...(abogadoId ? { abogadoId } : {}),
    }
}