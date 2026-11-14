/**
 * El reparto de las causas activas en la baja de un abogado (HU15, D-123).
 *
 * Funciones puras: el estado es "a quién va cada causa", con `null` mientras
 * está sin asignar. El formulario del prototipo ("Sin asignar" / "Pasan a")
 * se dibuja a partir de esto, y el cuerpo del `DELETE` también.
 */

import type { DeleteLawyerBody } from '@/features/lawyers/types/lawyerDeletion'

/** `caseId` → abogado de destino, o `null` si todavía no tiene. */
export type Reassignment = Readonly<Record<number, number | null>>

/** Todas las causas sin asignar. */
export function emptyReassignment(caseIds: readonly number[]): Reassignment {
    return Object.fromEntries(caseIds.map((id) => [id, null]))
}

/**
 * Rearma el reparto con las causas de ahora (tras un `409`, CA-15.10): lo ya
 * asignado se conserva, las causas nuevas entran sin asignar y las que ya no
 * son del abogado salen.
 */
export function syncReassignment(current: Reassignment, caseIds: readonly number[]): Reassignment {
    return Object.fromEntries(caseIds.map((id) => [id, current[id] ?? null]))
}

/** Asigna esas causas a un abogado. */
export function assign(current: Reassignment, caseIds: readonly number[], lawyerId: number): Reassignment {
    const next = { ...current }
    for (const id of caseIds) if (id in next) next[id] = lawyerId
    return next
}

/** Las vuelve a "Sin asignar". */
export function unassign(current: Reassignment, caseIds: readonly number[]): Reassignment {
    const next = { ...current }
    for (const id of caseIds) if (id in next) next[id] = null
    return next
}

/** Las causas que todavía no tienen abogado. */
export function pendingCaseIds(current: Reassignment): number[] {
    return Object.entries(current)
        .filter(([, lawyerId]) => lawyerId === null)
        .map(([id]) => Number(id))
}

/** Las causas que van a ese abogado. */
export function caseIdsFor(current: Reassignment, lawyerId: number): number[] {
    return Object.entries(current)
        .filter(([, target]) => target === lawyerId)
        .map(([id]) => Number(id))
}

/** `true` si todas las causas tienen abogado: recién ahí se puede confirmar. */
export function isComplete(current: Reassignment): boolean {
    return pendingCaseIds(current).length === 0
}

/**
 * El cuerpo del `DELETE`: una entrada por causa activa. Sin causas activas no
 * hay cuerpo (V6 L1769: "puede omitirse").
 */
export function toDeleteLawyerBody(current: Reassignment): DeleteLawyerBody | undefined {
    const entries = Object.entries(current)
    if (entries.length === 0) return undefined
    return {
        reassignments: entries.map(([caseId, lawyerId]) => ({
            caseId: Number(caseId),
            responsibleLawyerId: lawyerId as number,
        })),
    }
}

/** Para el aviso de éxito: "Peralta (2), Bustos (1)". */
export function countByLawyer(current: Reassignment): Map<number, number> {
    const counts = new Map<number, number>()
    for (const lawyerId of Object.values(current)) {
        if (lawyerId === null) continue
        counts.set(lawyerId, (counts.get(lawyerId) ?? 0) + 1)
    }
    return counts
}
