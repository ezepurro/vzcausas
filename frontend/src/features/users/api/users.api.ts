import type { ApiItem, ApiList } from '@/api-contract/envelopes'
import { http } from '@/shared/api/http'
import type {
    CreateUserBody,
    UpdateUserBody,
    User,
    UserListParams,
} from '@/features/users/types/user'
const RESOURCE = '/users'
export async function listUsers(params: UserListParams = {}): Promise<ApiList<User>> {
    const res = await http.get<ApiList<User>>(RESOURCE, {
        /* axios saltea las claves en `undefined`, así que un filtro vacío no
        viaja. `?search=` sería filtrar por cadena vacía, que no es lo
           mismo que no filtrar. */
        params: {
            page: params.page,
            limit: params.limit,
            search: params.search?.trim() || undefined,
            role: params.role,
        },
    })

    /* Único caso donde se devuelve casi todo: la paginación es dato que la
       pantalla necesita, no envoltorio que haya que esconder. */
    return res.data
}
export async function getUser(id: number): Promise<User> {
    const res = await http.get<ApiItem<User>>(`${RESOURCE}/${id}`)
    return res.data.data
}
export async function createUser(body: CreateUserBody): Promise<User> {
    const res = await http.post<ApiItem<User>>(RESOURCE, body)
    return res.data.data
}
export async function updateUser(id: number, body: UpdateUserBody): Promise<User> {
    const res = await http.patch<ApiItem<User>>(`${RESOURCE}/${id}`, body)
    return res.data.data
}
export async function deleteUser(id: number): Promise<void> {
    await http.delete(`${RESOURCE}/${id}`)
}