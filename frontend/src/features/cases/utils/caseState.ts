/**
 * El rótulo del estado procesal de una causa.
 *
 * `currentState` nunca es `null` (V3 D-34): una causa recién registrada está en
 * el estado inicial de su fuero, "Iniciada". El nombre lo manda siempre el
 * backend, así que acá no se pone ningún rótulo propio.
 */

import type { CurrentState } from '@/features/cases/types/case'

/**
 * Cómo llama el backend al estado inicial. Lo usa el resumen del alta, que
 * tiene que mostrarlo antes de que la causa exista.
 */
export const INITIAL_STATE_LABEL = 'Iniciada'

export function caseStateLabel(state: CurrentState): string {
    return state.name
}
