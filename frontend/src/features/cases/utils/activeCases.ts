/**
 * Las causas activas de una lista: las que no están en un estado terminal.
 *
 * La usa la baja de un cliente (HU11): el `409 CLIENT_HAS_ACTIVE_CASES` no
 * trae cuáles son, así que se piden sus causas (`GET /cases?clientId=`) y se
 * quedan las que no están en un estado terminal (V6 §3.6, CA-11.2). Las
 * dadas de baja ya no vienen en el listado.
 *
 * El estado de la causa no dice si es terminal: se busca en la tabla de
 * estados. "Iniciada" y un estado escrito a mano nunca lo son (V6 §4): en los
 * dos casos `proceduralStateId` viene en `null` (D-34).
 *
 * La regla es la misma que `isInTerminalState` de `proceedings`, que no se
 * puede importar desde acá: la flecha va `proceedings → cases`.
 */

import type { ProceduralState } from '@/features/legal-params'
import type { Case } from '@/features/cases/types/case'

export function activeCasesOf<T extends Pick<Case, 'currentState'>>(cases: T[], states: ProceduralState[]): T[] {
    const terminal = new Set(states.filter((s) => s.terminal).map((s) => s.id))
    return cases.filter((c) => {
        const id = c.currentState.proceduralStateId
        return id === null || !terminal.has(id)
    })
}