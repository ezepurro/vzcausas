/**
 * Del formulario al cuerpo del `PATCH /clients/{clientId}`: **sólo lo que
 * cambió** (HU10).
 *
 * El contrato responde 400 a un PATCH vacío (CA-10.1), así que si no cambió
 * nada la página ni siquiera tiene que llamar: para eso está `hasChanges`.
 * `clientSince` no está en el formulario y nunca viaja (CA-10.8).
 */

import type { Client, ClientFormValues, DocumentType, UpdateClientBody } from '@/features/clients/types/client'
import { normalizeDocumentNumber } from '@/features/clients/utils/clientFormat'

export function buildClientPatch(original: Client, values: ClientFormValues): UpdateClientBody {
    const patch: UpdateClientBody = {}

    /* Se recorta ANTES de comparar: un espacio de más no es un cambio. */
    const lastName = values.lastName.trim()
    if (lastName !== original.lastName) patch.lastName = lastName

    const firstName = values.firstName.trim()
    if (firstName !== original.firstName) patch.firstName = firstName

    /* El documento se puede cambiar (D-121). El número se limpia con el tipo
       que resulta, así "34.812.905" es el mismo DNI que "34812905" y no viaja
       (el propio no es un conflicto, CA-10.7). Si cambia sólo el tipo, viaja
       sólo el tipo: el backend valida el número que ya tenía (CA-10.3). */
    const documentType = values.documentType as DocumentType
    if (documentType !== original.documentType) patch.documentType = documentType

    const documentNumber = normalizeDocumentNumber(documentType, values.documentNumber)
    if (documentNumber !== original.documentNumber) patch.documentNumber = documentNumber

    const address = values.address.trim()
    if (address !== original.address) patch.address = address

    const phone = values.phone.trim()
    if (phone !== original.phone) patch.phone = phone

    /* Vaciar el correo lo borra: viaja `null` (CA-10.1). */
    const email = values.email.trim() || null
    if (email !== original.email) patch.email = email

    return patch
}

/** `true` si hay algo para mandar. */
export function hasChanges(patch: UpdateClientBody): boolean {
    return Object.keys(patch).length > 0
}