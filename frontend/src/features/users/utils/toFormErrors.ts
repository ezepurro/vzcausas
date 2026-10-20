import type { UserFormErrors } from '@/features/users/schemas/user.schema'
import type { UserFormValues } from '@/features/users/types/user'

/**
 * De los `details` de un 400 de `POST` o `PATCH /users` a los errores del
 * formulario.
 *
 * El servidor nombra los campos del CONTRATO y el formulario tiene los suyos:
 * - `roles` es un arreglo y en pantalla son tres casillas; el error va en la
 *   última, igual que en `validateUser`.
 * - la ficha nueva viaja anidada en `lawyer`, y el backend nombra sus errores
 *   con la ruta (`lawyer.registrationNumber`). Su apellido y sus nombres son
 *   los del usuario, así que van a esos mismos campos.
 *
 * Las claves que no son campos no tienen dónde pintarse y se descartan: si no
 * queda ninguna, la página avisa con `e.message` en lugar de quedar muda.
 */
const FIELD_BY_SERVER_NAME: Record<string, keyof UserFormValues> = {
    username: 'username',
    lastName: 'lastName',
    firstName: 'firstName',
    email: 'email',
    password: 'password',
    roles: 'roleSecretary',
    lawyerId: 'lawyerId',
    lawyer: 'registrationNumber',
    'lawyer.registrationNumber': 'registrationNumber',
    'lawyer.lastName': 'lastName',
    'lawyer.firstName': 'firstName',
}

export function toFormErrors(details: Record<string, string> | null): UserFormErrors {
    if (!details) return {}

    const errors: UserFormErrors = {}
    for (const [serverName, message] of Object.entries(details)) {
        const field = FIELD_BY_SERVER_NAME[serverName]
        // Si dos claves caen en el mismo campo, gana la primera: la del usuario
        // sobre la de su ficha.
        if (field && errors[field] === undefined) errors[field] = message
    }
    return errors
}
