import type { ClientFormValues, CreateClientBody, DocumentType } from '@/features/clients/types/client'
import { normalizeDocumentNumber } from '@/features/clients/utils/clientFormat'


//Recorta los espacios, limpia el número de documento según su tipo y saca los opcionales vacíos.
//El schema ya validó que el tipo sea uno de `DOCUMENT_TYPES`.
export function toCreateClientBody(values: ClientFormValues): CreateClientBody {
    const body: CreateClientBody = {
        lastName: values.lastName.trim(),
        firstName: values.firstName.trim(),
        documentType: values.documentType as DocumentType,
        documentNumber: normalizeDocumentNumber(values.documentType, values.documentNumber),
    }
    const address = values.address.trim()
    if (address) {
        body.address = address
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