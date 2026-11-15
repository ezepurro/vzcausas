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

    /** Las causas del abogado, para el reparto de la baja (HU15). Cuelga del detalle. */
    cases: (id: number) => [...lawyerKeys.detail(id), 'cases'] as const,

    /** El usuario vinculado a la ficha, para el aviso de la baja (CA-15.5). */
    linkedUser: (id: number) => [...lawyerKeys.detail(id), 'linked-user'] as const,
}
