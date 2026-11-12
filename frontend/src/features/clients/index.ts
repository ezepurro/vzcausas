/**
 * La cara pública del módulo.
 *
 * Otro módulo puede importar **esto** y nada más: `@/features/clients`, nunca
 * `@/features/clients/components/...`. Lo que no está acá adentro es asunto
 * interno del módulo y puede cambiar sin avisarle a nadie.
 */

export { ClientFormModal } from './components/ClientFormModal'
export { validateClient, isValid as isValidClient, type ClientFormErrors } from './schemas/client.schema'
export {
    DOCUMENT_TYPE_LABELS,
    formatClientName,
    formatDocument,
    formatDocumentNumber,
} from './utils/clientFormat'
export { DOCUMENT_TYPES } from './types/client'
export type { Client, ClientFormValues, CreateClientBody, DocumentType } from './types/client'
export { useClients } from './api/useClients'
export { useCreateClient } from './api/useCreateClient'
export { toCreateClientBody } from './utils/toCreateClientBody'
export { toFormErrors as toClientFormErrors } from './utils/toFormErrors'

