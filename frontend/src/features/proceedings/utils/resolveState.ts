/**
 * Qué estado de la tabla corresponde a lo cargado en el combobox, si hay uno.
 */

import type { ProceduralState } from '@/features/legal-params'
import type { ProceduralActFormValues } from '@/features/proceedings/types/proceduralAct'
import { findStateByName, stateOptions } from '@/features/proceedings/utils/stateOptions'

/**
 * El estado de la tabla al que pasa la causa, o `null` si lo cargado es un
 * estado escrito a mano (o todavía no hay nada).
 *
 * Si se eligió de la lista, manda el id. Si se escribió, cuenta como estado de
 * la tabla cuando el nombre coincide exacto (sin mayúsculas ni tildes): el
 * contrato pide mandar el `proceduralStateId` en ese caso (V3 §3.8).
 *
 * Sólo se consideran los estados que se ofrecen (vigentes y no terminales).
 */
export function resolveSelectedState(
    values: Pick<ProceduralActFormValues, 'stateText' | 'proceduralStateId'>,
    states: ProceduralState[],
): ProceduralState | null {
    const options = stateOptions(states)
    const id = values.proceduralStateId || findStateByName(options, values.stateText)?.value
    if (!id || !options.some((o) => o.value === id)) return null
    return states.find((s) => String(s.id) === id) ?? null
}

/** `true` si el estado de la tabla abre plazo. Un estado escrito a mano nunca abre. */
export function opensTerm(state: ProceduralState | null): boolean {
    return state !== null && state.timeLimitDays > 0
}
