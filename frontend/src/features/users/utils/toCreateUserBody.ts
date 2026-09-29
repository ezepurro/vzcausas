/** Del formulario al cuerpo del `POST /users`.*/

import type {
    CreateUserBody,
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
        fullName: values.fullName.trim(),
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
        return {
            lawyer: {
                fullName: values.lawyerFullName.trim(),
                registrationNumber: values.registrationNumber.trim(),
            },
        }
    }

    return { lawyerId: Number(values.lawyerId) }
}
