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
    customStates: (jurisdiction?: Jurisdiction) => [...casesKeys.lists(), 'custom-states', jurisdiction ?? 'all'] as const,
}
