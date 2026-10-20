import type { LawyerFormErrors } from '@/features/lawyers/schemas/lawyer.schema'
import type { LawyerFormValues } from '@/features/lawyers/types/lawyer'

/**
 * De los `details` de un 400 de `POST /lawyers` a los errores del formulario.
 *
 * Los nombres del contrato y los del formulario coinciden (V4 §3.3). Una clave
 * que el formulario no pinta no tiene dónde mostrarse y se descarta: si no
 * queda ninguna, la página avisa con `e.message` en lugar de quedar muda.
 */
const FIELD_BY_SERVER_NAME: Record<string, keyof LawyerFormValues> = {
    lastName: 'lastName',
    firstName: 'firstName',
    registrationNumber: 'registrationNumber',
}

export function toFormErrors(details: Record<string, string> | null): LawyerFormErrors {
    if (!details) return {}

    const errors: LawyerFormErrors = {}
    for (const [serverName, message] of Object.entries(details)) {
        const field = FIELD_BY_SERVER_NAME[serverName]
        if (field) errors[field] = message
    }
    return errors
}
