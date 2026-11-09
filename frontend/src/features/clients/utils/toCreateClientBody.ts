import type { ClientFormValues, CreateClientBody, DocumentType } from '@/features/clients/types/client'
import { normalizeDocumentNumber } from '@/features/clients/utils/clientFormat'


//Recorta los espacios, limpia el número de documento según su tipo y saca el correo si está vacío.
//El schema ya validó que el tipo sea uno de `DOCUMENT_TYPES`.
export function toCreateClientBody(values: ClientFormValues): CreateClientBody {
    const body: CreateClientBody = {
        lastName: values.lastName.trim(),
        firstName: values.firstName.trim(),
        documentType: values.documentType as DocumentType,
        documentNumber: normalizeDocumentNumber(values.documentType, values.documentNumber),
        // Obligatorios desde D-109: el schema ya validó que no estén vacíos.
        address: values.address.trim(),
        phone: values.phone.trim(),
    }
    const email = values.email.trim()
    if (email) {
        body.email = email
    }
    return body
}