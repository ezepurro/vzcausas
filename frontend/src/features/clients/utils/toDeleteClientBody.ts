import type { DeleteClientBody, DeleteClientFormValues } from '@/features/clients/types/clientDeletion'

/**
 * Del diálogo al cuerpo de la baja: recorta espacios, y sin motivo no viaja
 * cuerpo. El contrato lo admite: el cuerpo del `DELETE /clients/{clientId}`
 * es opcional (V6 §3.6).
 */
export function toDeleteClientBody(values: DeleteClientFormValues): DeleteClientBody | undefined {
    const reason = values.reason.trim()
    return reason ? { reason } : undefined
}