import type { ApiItem, ApiList } from '@/api-contract/envelopes'
import { http } from '@/shared/api/http'
import type {
    CreateLawyerBody,
    Lawyer,
    LawyerListParams,
    UpdateLawyerBody,
} from '@/features/lawyers/types/lawyer'

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
 * Baja. Para el front el abogado desaparece y no vuelve.
 *
 * Que el backend conserve el registro poniendo `active` en `false` es asunto
 * suyo: desde acá no hay forma de listarlo ni de reactivarlo.
 */
export async function deleteLawyer(id: number): Promise<void> {
    await http.delete(`${RESOURCE}/${id}`)
}
