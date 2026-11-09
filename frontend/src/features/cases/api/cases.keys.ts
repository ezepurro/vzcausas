import type { CaseListParams } from '@/features/cases/types/case'
import type { Jurisdiction } from '@/features/legal-params'

/**
 * Claves de caché, en jerarquía. Nadie escribe una clave a mano fuera de este
 * archivo: se publican en el `index.ts` porque registrar un acto procesal
 * cambia la causa y el módulo `proceedings` tiene que invalidarlas.
 *
 * Los parámetros del listado van ADENTRO de la clave: si no, la página 1 y la
 * página 2 escriben en la misma entrada y se pisan.
 */
export const casesKeys = {
    all: ['cases'] as const,
    lists: () => [...casesKeys.all, 'list'] as const,
    list: (params: CaseListParams) => [...casesKeys.lists(), params] as const,
    details: () => [...casesKeys.all, 'detail'] as const,
    detail: (id: number) => [...casesKeys.details(), id] as const,
    /* La línea de vida cuelga del detalle a propósito: lo que invalida la
       causa (registrar un acto procesal o interruptivo) la invalida también. */
    timeline: (id: number) => [...casesKeys.detail(id), 'timeline'] as const,
    /* Los documentos también cuelgan del detalle: modificar la causa (que
        puede renombrar su carpeta) los refresca, y darla de baja los remueve. */
    documents: (id: number) => [...casesKeys.detail(id), 'documents'] as const,
    /* La carátula cuelga del detalle: modificar la causa la invalida, y la
        próxima vista previa ya refleja el cambio (CA-24.8). */
    cover: (id: number) => [...casesKeys.detail(id), 'cover'] as const,

    customStates: (jurisdiction?: Jurisdiction) => [...casesKeys.lists(), 'custom-states', jurisdiction ?? 'all'] as const,
}
