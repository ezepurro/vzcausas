import { http } from '@/shared/api/http'
import type { ApiItem } from '@/api-contract/envelopes'
import type { Case, CreateCaseBody } from '@/features/cases/types/case'

/**
 * Todo lo que habla con el servidor, una función por endpoint.
 *
 * Siempre con `http`, nunca `fetch` ni `axios` directo: es lo que garantiza
 * que un error llegue al `catch` convertido en `ApiError`. Acá se saca el
 * envoltorio del contrato: para afuera sale el recurso pelado.
 *
 * Por ahora sólo el detalle, que es lo que necesita Registrar acto procesal
 * (HU26). El listado y el alta se suman con sus pantallas.
 */

const BASE = '/cases'

export async function getCase(id: number): Promise<Case> {
    const response = await http.get<ApiItem<Case>>(`${BASE}/${id}`)
    return response.data.data
}

export async function createCase(body: CreateCaseBody): Promise<Case> {
    const response = await http.post<ApiItem<Case>>(BASE, body)
    return response.data.data
}
