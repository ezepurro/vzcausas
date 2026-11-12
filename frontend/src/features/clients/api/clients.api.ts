import type { ApiItem, ApiList } from '@/api-contract/envelopes'
import { http } from '@/shared/api/http'
import type { Client, ClientListParams, CreateClientBody } from '@/features/clients/types/client'

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
