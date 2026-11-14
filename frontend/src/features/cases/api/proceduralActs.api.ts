import { http } from '@/shared/api/http'
import type { AnnulProceduralActBody } from '@/features/cases/types/proceduralActAnnulment'

/**
 * Lo que `cases` le pide al servidor sobre los actos procesales: sólo la
 * anulación (HU29), que se hace desde la línea de vida del detalle. El
 * registro y la modificación son de `proceedings`, que tiene su propia página.
 */

const base = (caseId: number) => `/cases/${caseId}/procedural-acts`

/**
 * Anula un acto procesal (V6 §3.8, D-124). El cuerpo es opcional: sin motivo
 * no viaja. Responde `204` sin cuerpo.
 */
export async function annulProceduralAct(
    caseId: number,
    actId: number,
    body?: AnnulProceduralActBody,
): Promise<void> {
    await http.delete(`${base(caseId)}/${actId}`, { data: body })
}
