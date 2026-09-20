import type { PaginatedQuery } from '@/api-contract/envelopes'
export type Role = 'ADMINISTATOR' | 'LAWYER' | 'SECRETARIAT'

export const ROLES: readonly Role[] = ['ADMINISTATOR', 'LAWYER', 'SECRETARIAT']

export interface User {
    id: number
    username: string
    /** El contrato lo devuelve siempre como arreglo: un usuario puede tener más de un rol. */
    role: Role[]

    abogadoId?: string

    /**
     * PENDIENTE BACKEND · El nombre para mostrar del abogado vinculado. Con
     * el id solo, la columna mostraría un número: no existe `GET /lawyers`
     * para traducirlo (de `lawyers` el contrato sólo tiene el POST).
     */
    abogadoNombre?: string

    /**
     * PENDIENTE BACKEND · Último ingreso, en ISO 8601. No existe hoy en
     * ninguna parte del sistema: ni en el contrato, ni en el modelo, ni en
     * el mock.
     */
    lastLoginAt?: string
}

export interface CreateUserBody {
    username: string
    password: string
    role: Role[]
    /**
     * Único campo en castellano del contrato, y viaja como string aunque los
     * ids sean enteros. Obligatorio si el rol es `LAWYER`: sin un abogado que
     * exista, el alta responde 422.
     */
    abogadoId?: string
}

export interface UpdateUserBody {
    username?: string
    role?: Role[]
    abogadoId?: string
}

export interface UserFormValues {
    username: string
    password: string
    role: string
    abogadoId: string
}


/** Parámetros del listado `GET /users`. Van también en la clave de caché. */
export interface UserListParams {
    page?: number
    limit?: number
    search?: string
    role?: Role
}
/** Parámetros del listado `GET /users`. Van también en la clave de caché. */
export interface UserListParams extends PaginatedQuery {
    search?: string
    role?: Role
}