/**
 * La cara pública del módulo.
 *
 * Otro módulo puede importar **esto** y nada más: `@/features/clients`, nunca
 * `@/features/clients/components/...`. Lo que no está acá adentro es asunto
 * interno del módulo y puede cambiar sin avisarle a nadie.
 */

export { ClientFormModal } from './components/ClientFormModal'
export { validateClient, isValid as isValidClient, type ClientFormErrors } from './schemas/client.schema'
export { formatClientName, formatDni, normalizeDni } from './utils/clientFormat'
export type { Client, ClientFormValues, CreateClientBody } from './types/client'
export { useClients } from './api/useClients'
export { useCreateClient } from './api/useCreateClient'
