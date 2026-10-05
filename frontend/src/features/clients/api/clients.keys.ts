import type { ClientListParams } from '@/features/clients/types/client'

export const clientKeys = {
    /** Todo lo de clientes */
    all: ['clients'] as const,

    /** Todos los listados, sin importar página ni filtros. */
    lists: () => [...clientKeys.all, 'list'] as const,

    /** Un listado concreto. Los parámetros van adentro de la clave. */
    list: (params: ClientListParams) => [...clientKeys.lists(), params] as const,

    /** Todos los detalles */
    details: () => [...clientKeys.all, 'detail'] as const,

    /** El detalle de un cliente */
    detail: (id: number) => [...clientKeys.details(), id] as const,
}