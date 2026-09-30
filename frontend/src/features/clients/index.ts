/**
 * La cara pública del módulo.
 *
 * Otro módulo puede importar **esto** y nada más: `@/features/clients`, nunca
 * `@/features/clients/components/...`. Lo que no está acá adentro es asunto
 * interno del módulo y puede cambiar sin avisarle a nadie.
 *
 * Existe porque el alta de causa elige un cliente y ofrece "Registrar cliente
 * nuevo" sin salir de la pantalla, y la tarjeta del detalle lo muestra igual
 * que el listado. Cuando existan los hooks (`useClients`, `useCreateClient`),
 * se publican acá también.
 */

export { ClientFormModal } from './components/ClientFormModal'
export { validateClient, isValid as isValidClient, type ClientFormErrors } from './schemas/client.schema'
export { formatClientName, formatDni, normalizeDni } from './utils/clientFormat'
export type { Client, ClientFormValues, CreateClientBody } from './types/client'
