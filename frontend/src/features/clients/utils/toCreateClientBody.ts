import type { ClientFormValues, CreateClientBody } from '@/features/clients/types/client'
import { normalizeDni } from '@/features/clients/utils/clientFormat'


//Recorta los espacios, deja el DNI sólo con dígitos y saca los opcionales vacíos.
export function toCreateClientBody(values: ClientFormValues): CreateClientBody {
    const body: CreateClientBody = {
        lastName: values.lastName.trim(),
        firstName: values.firstName.trim(),
        dni: normalizeDni(values.dni),
    }
    const phone = values.phone.trim()
    if (phone) {
        body.phone = phone
    }
    const email = values.email.trim()
    if (email) {
        body.email = email
    }
    return body
}