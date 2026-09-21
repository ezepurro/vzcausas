import type { LawyerListParams } from '@/features/lawyers/types/lawyer'

export const lawyerKeys = {
    /** Todo lo de lawyers. Invalidarla voltea listados y detalles. */
    all: ['lawyers'] as const,

    /** Todos los listados, sin importar página ni filtros. */
    lists: () => [...lawyerKeys.all, 'list'] as const,

    /** Un listado concreto. Los parámetros van adentro de la clave. */
    list: (params: LawyerListParams) => [...lawyerKeys.lists(), params] as const,

    /** Todos los detalles. */
    details: () => [...lawyerKeys.all, 'detail'] as const,

    /** El detalle de un abogado. */
    detail: (id: number) => [...lawyerKeys.details(), id] as const,
}
