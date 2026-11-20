import { db } from '@/shared/mocks'

/** Desde cuándo es huérfana la causa que arma `orphanCase`. */
export const ORPHANED_AT = '2026-09-10T10:00:00-03:00'

/**
 * Deja una causa de la base del mock huérfana, sin abogado responsable, como
 * la deja la baja de su abogado (D-143). El mock no trae ninguna huérfana
 * entre sus semillas: el test la arma antes de renderizar, y el setup
 * devuelve la base a su estado al terminar cada test.
 */
export function orphanCase(caseId: number): void {
    const stored = db.cases.find((c) => c.id === caseId)
    if (!stored) throw new Error(`[test] La causa ${caseId} no existe en el mock.`)
    stored.responsibleLawyerId = null
    stored.orphanedAt = ORPHANED_AT
}
