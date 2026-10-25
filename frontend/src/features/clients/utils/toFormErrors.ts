import type { ClientFormErrors } from '@/features/clients/schemas/client.schema'
import type { ClientFormValues } from '@/features/clients/types/client'

/**
 * De los `details` de un 400 de `POST /clients` a los errores del formulario.
 *
 * Los nombres del contrato y los del formulario coinciden (V4 §3.6). Una clave
 * que el formulario no pinta no tiene dónde mostrarse y se descarta: si no
 * queda ninguna, la página avisa con `e.message` en lugar de quedar muda.
 */
const FIELD_BY_SERVER_NAME: Record<string, keyof ClientFormValues> = {
    lastName: 'lastName',
    firstName: 'firstName',
    dni: 'dni',
    phone: 'phone',
    email: 'email',
}

export function toFormErrors(details: Record<string, string> | null): ClientFormErrors {
    if (!details) return {}

    const errors: ClientFormErrors = {}
    for (const [serverName, message] of Object.entries(details)) {
        const field = FIELD_BY_SERVER_NAME[serverName]
        if (field) errors[field] = message
    }
    return errors
}
