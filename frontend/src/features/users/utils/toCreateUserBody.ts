/** Del formulario al cuerpo del `POST /users`.*/

import type {
    CreateUserBody,
    NewLawyerBody,
    Role,
    UserFormValues,
} from '@/features/users/types/user'
import { isCreatingLawyer, needsLawyer } from '@/features/users/utils/lawyerLink'

/**
 * `role` llega ya traducido del rótulo del select: lo hace la página, que es
 * la misma que se lo pasa al schema. Así acá no hay que contemplar el caso
 * "el rótulo no era ninguno de los tres" — si llegaste hasta acá, validó.
 */
export function toCreateUserBody(values: UserFormValues, roles: Role[]): CreateUserBody {
    return {
        username: values.username.trim(),
        lastName: values.lastName.trim(),
        firstName: values.firstName.trim(),
        email: values.email.trim(),
        /* La contraseña NO se recorta: un espacio al principio o al final es
           parte de la contraseña, no basura de tipeo. */
        password: values.password,
        roles,
        ...lawyerPart(values, roles),
    }
}

/**
 * La parte del cuerpo que resuelve la ficha profesional.
 * Devuelve `lawyerId`, `lawyer` o nada: los dos primeros son mutuamente
 * excluyentes y mandar ambos es un 400. Con perfil Secretaría no va ninguno.
 *
 * Cuando va `lawyer`, el backend registra la ficha y el usuario en una única
 * transacción. Por eso el alta de una ficha nueva se manda acá adentro y no
 * como un `POST /lawyers` encadenado: si el alta del usuario falla, un
 * encadenado dejaría el abogado ya registrado y sin vínculo, y desde el
 * cliente no hay forma de deshacerlo.
 */
function lawyerPart(
    values: UserFormValues,
    roles: Role[],
): Pick<CreateUserBody, 'lawyerId' | 'lawyer'> {
    if (!needsLawyer(roles)) return {}

    if (isCreatingLawyer(values.lawyerMode)) {
        /* La ficha nueva lleva el apellido y los nombres del usuario:
           es la misma persona y no se cargan dos veces (TESTING.md §11). */
        const lawyer: NewLawyerBody = {
            lastName: values.lastName.trim(),
            firstName: values.firstName.trim(),
        }
        /* La matrícula es opcional: vacía no viaja. */
        const registrationNumber = values.registrationNumber.trim()
        if (registrationNumber) {
            lawyer.registrationNumber = registrationNumber
        }
        return { lawyer }
    }

    return { lawyerId: Number(values.lawyerId) }
}
