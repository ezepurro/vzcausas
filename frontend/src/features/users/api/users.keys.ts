import type { UserListParams } from '@/features/users/types/user'

export const userKeys = {
    /** Todo lo de users. Invalidarla voltea listados y detalles. */
    all: ['users'] as const,

    /** Todos los listados, sin importar página ni filtros. */
    lists: () => [...userKeys.all, 'list'] as const,

    /** Un listado concreto. Los parámetros van adentro de la clave. */
    list: (params: UserListParams) => [...userKeys.lists(), params] as const,

    /** Todos los detalles. */
    details: () => [...userKeys.all, 'detail'] as const,

    /** El detalle de un usuario. */
    detail: (id: number) => [...userKeys.details(), id] as const,
}