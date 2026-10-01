/**
 * El estado procesal de una causa, como se muestra.
 *
 * Una causa nace sin estado: `currentState` viene en `null` hasta que se
 * registra su primer acto procesal (V3 D-09). El contrato deja el rótulo del
 * lado del front, y como aparece en la tabla, en el encabezado, en el resumen
 * del alta y en el filtro, se define una sola vez acá.
 */

import type { CaseState } from '@/features/cases/types/case'

/** El rótulo del estado de sistema que tiene una causa sin actos. */
export const NO_PROCEDURAL_ACT_LABEL = 'Sin acto procesal'

/** El nombre del estado actual, o "Sin acto procesal" si todavía no tiene. */
export function caseStateLabel(state: CaseState | null): string {
    return state === null ? NO_PROCEDURAL_ACT_LABEL : state.name
}
