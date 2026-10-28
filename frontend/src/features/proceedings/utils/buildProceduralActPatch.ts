/**
 * Del formulario al cuerpo del `PATCH /cases/{caseId}/procedural-acts/{actId}`
 * (HU28): **sólo lo que cambió** respecto del acto que se abrió.
 *
 * El contrato responde 400 a un PATCH vacío (CA-28.3), así que si no cambió
 * nada la página ni siquiera tiene que llamar: para eso está `hasChanges`.
 */

import type { Jurisdiction, ProceduralState } from '@/features/legal-params'
import type {
    ProceduralAct,
    ProceduralActFormValues,
    UpdateProceduralActBody,
} from '@/features/proceedings/types/proceduralAct'

/**
 * `selected` es el estado de la tabla que resolvió `resolveSelectedState`;
 * `null` = estado escrito a mano. `values` llega con el ajuste manual ya
 * destildado si el estado elegido es terminal, como en el registro.
 */
export function buildProceduralActPatch(
    original: ProceduralAct,
    values: ProceduralActFormValues,
    selected: ProceduralState | null,
    jurisdiction: Jurisdiction,
): UpdateProceduralActBody {
    const patch: UpdateProceduralActBody = {}

    /* Cambiar el estado recalcula el plazo con la tabla de hoy (D-98): sólo
       viaja si de verdad cambió. Excluyentes, como en el registro. */
    if (!keepsState(original, values, selected)) {
        if (selected) patch.proceduralStateId = selected.id
        else patch.customState = values.stateText.trim()
    }

    if (values.actDate !== original.actDate) patch.actDate = values.actDate

    // RN6: la notificación existe sólo en el fuero administrativo.
    if (jurisdiction === 'ADMINISTRATIVE') {
        const notificationDate = values.notificationDate || null
        if (notificationDate !== original.notificationDate) patch.notificationDate = notificationDate
    }

    /* Un ajuste que no se toca se conserva (CA-28.6); destildarlo manda
       `null` y vuelve al vencimiento calculado. Hacia un estado terminal el
       ajuste llega destildado: si el acto tenía uno, se quita. */
    const savedManual = original.deadline?.manuallyAdjusted ? original.deadline.dueDate : null
    const manualDueDate = values.manualDue && values.manualDueDate ? values.manualDueDate : null
    if (manualDueDate !== savedManual) patch.manualDueDate = manualDueDate

    // Vaciar las observaciones las borra.
    const notes = values.notes.trim() || null
    if (notes !== (original.notes ?? null)) patch.notes = notes

    return patch
}

/** `true` si hay algo para mandar. */
export function hasChanges(patch: UpdateProceduralActBody): boolean {
    return Object.keys(patch).length > 0
}

/**
 * `true` si el parche no toca ni el estado ni las fechas: el vencimiento sigue
 * siendo el que el acto tiene guardado, con el plazo que copió al registrarse
 * (D-98). `deadline-preview` lo calcularía con la tabla de hoy.
 */
export function keepsSavedTerm(patch: UpdateProceduralActBody): boolean {
    return (
        patch.proceduralStateId === undefined &&
        patch.customState === undefined &&
        patch.actDate === undefined &&
        patch.notificationDate === undefined
    )
}

/**
 * Si lo cargado es el mismo estado que tiene el acto. Se compara con el
 * original y no sólo con `selected`: un estado de la tabla que se dio de baja
 * después de registrar el acto ya no está entre las opciones y no se resuelve,
 * pero dejarlo como estaba no es un cambio.
 */
function keepsState(
    original: ProceduralAct,
    values: ProceduralActFormValues,
    selected: ProceduralState | null,
): boolean {
    const { proceduralStateId, name, custom } = original.resultingState
    if (custom) return selected === null && values.stateText.trim() === name
    if (selected) return selected.id === proceduralStateId
    return values.proceduralStateId === String(proceduralStateId)
}
