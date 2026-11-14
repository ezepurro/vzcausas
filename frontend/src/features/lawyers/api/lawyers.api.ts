import type { ApiItem, ApiList } from '@/api-contract/envelopes'
import { http } from '@/shared/api/http'
import type {
    CreateLawyerBody,
    Lawyer,
    LawyerListParams,
    UpdateLawyerBody,
} from '@/features/lawyers/types/lawyer'
import type { DeleteLawyerBody, LawyerCase, LinkedUser } from '@/features/lawyers/types/lawyerDeletion'

const RESOURCE = '/lawyers'

export async function listLawyers(params: LawyerListParams = {}): Promise<ApiList<Lawyer>> {
    const res = await http.get<ApiList<Lawyer>>(RESOURCE, {
        params: {
            page: params.page,
            limit: params.limit,
            search: params.search?.trim() || undefined,
        },
    })

    return res.data
}

export async function getLawyer(id: number): Promise<Lawyer> {
    const res = await http.get<ApiItem<Lawyer>>(`${RESOURCE}/${id}`)
    return res.data.data
}

export async function createLawyer(body: CreateLawyerBody): Promise<Lawyer> {
    const res = await http.post<ApiItem<Lawyer>>(RESOURCE, body)
    return res.data.data
}

export async function updateLawyer(id: number, body: UpdateLawyerBody): Promise<Lawyer> {
    const res = await http.patch<ApiItem<Lawyer>>(`${RESOURCE}/${id}`, body)
    return res.data.data
}

/**
 * Baja (HU15, V6 §3.3). Para el front el abogado desaparece y no vuelve.
 *
 * Que el backend conserve el registro poniendo `active` en `false` es asunto
 * suyo: desde acá no hay forma de listarlo ni de reactivarlo. El reparto de
 * sus causas activas viaja en el cuerpo; sin causas activas no hay cuerpo.
 */
export async function deleteLawyer(id: number, body?: DeleteLawyerBody): Promise<void> {
    await http.delete(`${RESOURCE}/${id}`, { data: body })
}

/** El tope de `limit` del contrato (§4.1): con él se recorren las páginas. */
const PAGE_LIMIT = 100

/** Junta todas las páginas de un listado. */
async function fetchAll<T>(url: string, params: Record<string, unknown>): Promise<T[]> {
    const rows: T[] = []
    let page = 1
    let totalPages = 1
    do {
        const res = await http.get<ApiList<T>>(url, { params: { ...params, page, limit: PAGE_LIMIT } })
        rows.push(...res.data.data)
        totalPages = res.data.pagination.totalPages
        page += 1
    } while (page <= totalPages)
    return rows
}

/**
 * Las causas de las que el abogado es responsable, activas y terminales
 * (`GET /cases?responsibleLawyerId=`, D-75). V6 no tiene un filtro de "solo
 * activas": las terminales se descartan en `useLawyerActiveCases`.
 */
export function listLawyerCases(lawyerId: number): Promise<LawyerCase[]> {
    return fetchAll<LawyerCase>('/cases', { responsibleLawyerId: lawyerId })
}

/**
 * El usuario vinculado a la ficha, si tiene (V6 L1756-1761). `GET /users` no
 * filtra por abogado: se piden los que tienen el rol `LAWYER` y se busca el
 * que apunta a esta ficha.
 */
export async function findLinkedUser(lawyerId: number): Promise<LinkedUser | null> {
    const users = await fetchAll<LinkedUser>('/users', { role: 'LAWYER' })
    return users.find((u) => u.lawyer?.id === lawyerId) ?? null
}
