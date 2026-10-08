import { http } from '@/shared/api/http'
import type { ApiItem } from '@/api-contract/envelopes'
import type { Case, CreateCaseBody } from '@/features/cases/types/case'
import type {  ApiList } from '@/api-contract/envelopes'
import type { CaseListParams } from '@/features/cases/types/case'
import type { Jurisdiction } from '@/features/legal-params'
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

export async function getCases(params: CaseListParams = {}): Promise<ApiList<Case>> {
    const response = await http.get<ApiList<Case>>(BASE, { params: {...params, search: params.search?.trim() || undefined } })
    return response.data
}

/**
 * Los estados escritos a mano que tienen hoy las causas: el grupo "Escritos a
 * mano en causas" del filtro de estado. Es la única colección sin paginar.
 */
export async function getCustomStates(jurisdiction?: Jurisdiction): Promise<string[]> {
    const response = await http.get<ApiItem<string[]>>(`${BASE}/custom-states`, { params: { jurisdiction }})
    return response.data.data
}
export async function getCase(id: number): Promise<Case> {
    const response = await http.get<ApiItem<Case>>(`${BASE}/${id}`)
    return response.data.data
}

export async function createCase(body: CreateCaseBody): Promise<Case> {
    const response = await http.post<ApiItem<Case>>(BASE, body)
    return response.data.data
}
