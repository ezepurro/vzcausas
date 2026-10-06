/**
 * Si la causa admite actos procesales.
 */

import type { Case } from '@/features/cases'
import type { ProceduralState } from '@/features/legal-params'

/**
 * `true` si la causa está en un estado terminal ("Archivada", "Prescripta").
 * Esa causa no admite actos (`422 CASE_IN_TERMINAL_STATE`), así que la
 * pantalla no ofrece el formulario.
 *
 * El estado de la causa no dice si es terminal: se busca en la tabla del
 * fuero. Una causa sin actos o con un estado escrito a mano nunca lo es.
 */
export function isInTerminalState(
    c: Pick<Case, 'currentState'>,
    states: ProceduralState[],
): boolean {
    const id = c.currentState?.proceduralStateId
    if (id == null) return false
    return states.some((s) => s.id === id && s.terminal)
}
