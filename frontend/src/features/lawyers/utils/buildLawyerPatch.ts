/**
 * Del formulario al cuerpo del `PATCH /lawyers/{id}`: **sólo lo que cambió**.
 *
 * El contrato responde 400 a un PATCH vacío (CA-14.10), así que si no cambió
 * nada la página ni siquiera tiene que llamar: para eso está `hasChanges`.
 */

import type { Lawyer, LawyerFormValues, UpdateLawyerBody } from '@/features/lawyers/types/lawyer'

export function buildLawyerPatch(original: Lawyer, values: LawyerFormValues): UpdateLawyerBody {
    const patch: UpdateLawyerBody = {}

    /* Se recorta ANTES de comparar: un espacio de más no es un cambio. */
    const lastName = values.lastName.trim()
    if (lastName !== original.lastName) patch.lastName = lastName

    const firstName = values.firstName.trim()
    if (firstName !== original.firstName) patch.firstName = firstName

    /* La misma matrícula no viaja: no es un conflicto (CA-14.7), pero
       tampoco es un cambio. Vaciarla la borra: viaja `null`. */
    const registrationNumber = values.registrationNumber.trim() || null
    if (registrationNumber !== original.registrationNumber) patch.registrationNumber = registrationNumber

    return patch
}

/** `true` si hay algo para mandar. */
export function hasChanges(patch: UpdateLawyerBody): boolean {
    return Object.keys(patch).length > 0
}
