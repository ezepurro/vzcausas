import { http } from '@/shared/api/http'
import type { ApiItem } from '@/api-contract/envelopes'
import type {
    CreateProceduralActBody,
    DeadlinePreview,
    DeadlinePreviewParams,
    ProceduralAct,
} from '@/features/proceedings/types/proceduralAct'

/**
 * Todo lo que habla con el servidor, una función por endpoint (V3 §3.8).
 *
 * Siempre con `http`, nunca `fetch` ni `axios` directo: es lo que garantiza
 * que un error llegue al `catch` convertido en `ApiError`. Acá se saca el
 * envoltorio del contrato: para afuera sale el recurso pelado.
 */

const base = (caseId: number) => `/cases/${caseId}/procedural-acts`

export async function registerProceduralAct(
    caseId: number,
    body: CreateProceduralActBody,
): Promise<ProceduralAct> {
    const response = await http.post<ApiItem<ProceduralAct>>(base(caseId), body)
    return response.data.data
}

export async function getDeadlinePreview(
    caseId: number,
    params: DeadlinePreviewParams,
): Promise<DeadlinePreview> {
    const response = await http.get<ApiItem<DeadlinePreview>>(`${base(caseId)}/deadline-preview`, {
        params: {
            proceduralStateId: params.proceduralStateId,
            actDate: params.actDate,
            // Un filtro vacío no viaja.
            notificationDate: params.notificationDate || undefined,
        },
    })
    return response.data.data
}
