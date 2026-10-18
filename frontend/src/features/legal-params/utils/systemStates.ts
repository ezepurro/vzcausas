/**
 * Los estados de sistema que sí figuran en la tabla de estados procesales.
 *
 * Desde V4 el fuero penal tiene un segundo estado de sistema, **"Prescripta"**
 * (D-53): terminal, visible en el listado y en el filtro de causas, pero
 * protegido. `PATCH` y `DELETE` sobre él responden
 * `422 PROCEDURAL_STATE_PROTECTED`, y no puede ser destino de un acto
 * procesal: a "Prescripta" se llega solo con "Marcar prescripta" (D-69).
 *
 * El contrato no le da una marca propia al recurso: se lo reconoce por su
 * denominación, que está reservada en el fuero penal (registrar otro estado
 * con ese nombre responde `409`). "Iniciada" no está acá porque no forma parte
 * del listado.
 */

import type { ProceduralState } from '@/features/legal-params/types/proceduralState';

/** La denominación del estado de sistema terminal del fuero penal. */
export const PRESCRIBED_STATE_NAME = 'Prescripta';

/** `true` si es "Prescripta", el estado de sistema del fuero penal. */
export function isPrescribedState(
    state: Pick<ProceduralState, 'name' | 'jurisdiction' | 'terminal'>,
): boolean {
    return (
        state.jurisdiction === 'CRIMINAL' &&
        state.terminal &&
        state.name.trim().toLowerCase() === PRESCRIBED_STATE_NAME.toLowerCase()
    );
}
