/**
 * Baja de abogado con el reparto de sus causas activas (HU15, V6 §3.3, D-123).
 *
 * Escrito a partir del contrato, no copiado de `shared/mocks`. Las causas y el
 * usuario vinculado se piden desde este módulo con tipos mínimos: `cases` y
 * `users` dependen de `lawyers`, así que importarlos de ahí invertiría la
 * flecha (`frontend/CLAUDE.md`, "Qué publica el `index.ts` de cada módulo").
 */

/**
 * Una entrada del reparto: la causa y el abogado que pasa a ser su
 * responsable o, **(D-143)**, `unassigned: true` si queda sin responsable
 * (causa huérfana). Lleva una cosa o la otra, nunca las dos ni ninguna.
 */
export type LawyerReassignment =
    | { caseId: number; responsibleLawyerId: number }
    | { caseId: number; unassigned: true }

/**
 * Cuerpo del `DELETE /lawyers/{lawyerId}`. Una entrada por **cada causa
 * activa**; sin causas activas no viaja (V6 L1769-1789).
 */
export interface DeleteLawyerBody {
    reassignments: LawyerReassignment[]
}

export type CaseJurisdiction = 'CRIMINAL' | 'ADMINISTRATIVE' | 'AMPARO'

/**
 * Lo que el formulario necesita de cada causa del abogado (`GET /cases`,
 * V6 §3.7). `currentState.proceduralStateId` dice, cruzado con
 * `GET /procedural-states`, si la causa está en un estado terminal.
 */
export interface LawyerCase {
    id: number
    sacNumber: string | null
    caption: string
    jurisdiction: CaseJurisdiction
    currentState: {
        /** `null` en el estado inicial o en uno escrito a mano: nunca es terminal. */
        proceduralStateId: number | null
        name: string
    }
}

export type LinkedUserRole = 'ADMINISTRATOR' | 'LAWYER' | 'SECRETARY'

/** El usuario vinculado a la ficha, tal como viene de `GET /users` (V6 L1756-1761). */
export interface LinkedUser {
    id: number
    username: string
    roles: LinkedUserRole[]
    lawyer: { id: number } | null
}
