import type { ApiItem, ApiList } from '@/api-contract/envelopes'
import { http } from '@/shared/api/http'
import type {
    Client,
    ClientListParams,
    CreateClientBody,
    UpdateClientBody,
} from '@/features/clients/types/client'
import type { DeleteClientBody } from '@/features/clients/types/clientDeletion'

const RESOURCE = '/clients'

export async function listClients(params: ClientListParams = {}): Promise<ApiList<Client>> {
    const res = await http.get<ApiList<Client>>(RESOURCE, { params: {
        page: params.page,
        limit: params.limit,
        search: params.search?.trim() || undefined,
    } })
    return res.data
}

export async function getClient(id: number): Promise<Client> {
    const res = await http.get<ApiItem<Client>>(`${RESOURCE}/${id}`)
    return res.data.data
}

export async function createClient(body: CreateClientBody): Promise<Client> {
    const res = await http.post<ApiItem<Client>>(RESOURCE, body)
    return res.data.data
}

/**
 * `PATCH /clients/{clientId}` (HU10). Manda sólo lo que cambió: el cuerpo lo
 * arma `buildClientPatch`, y si no cambió nada la página ni llama.
 */
export async function updateClient(id: number, body: UpdateClientBody): Promise<Client> {
    const res = await http.patch<ApiItem<Client>>(`${RESOURCE}/${id}`, body)
    return res.data.data
}

/**
 * `DELETE /clients/{clientId}` (HU11). Responde `204`, sin cuerpo. El motivo
 * es opcional: sin él no viaja cuerpo (`toDeleteClientBody`).
 */
export async function deleteClient(id: number, body?: DeleteClientBody): Promise<void> {
    await http.delete(`${RESOURCE}/${id}`, { data: body })
}