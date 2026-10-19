import { http } from '@/shared/api/http'
import type { ApiItem } from '@/api-contract/envelopes'
import type { CreateInterruptiveActBody, InterruptiveAct } from '@/features/cases/types/interruptiveAct'

/**
 * Los actos interruptivos de una causa (V4 §3.9). Sólo el registro: la
 * consulta se hace en la línea de vida (`getCaseTimeline`, D-85), y ninguna
 * pantalla usa el listado.
 */

const base = (caseId: number) => `/cases/${caseId}/interruptive-acts`

export async function createInterruptiveAct(
    caseId: number,
    body: CreateInterruptiveActBody,
): Promise<InterruptiveAct> {
    const response = await http.post<ApiItem<InterruptiveAct>>(base(caseId), body)
    return response.data.data
}
