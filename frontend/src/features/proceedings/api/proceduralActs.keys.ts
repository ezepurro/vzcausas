import type { DeadlinePreviewParams } from '@/features/proceedings/types/proceduralAct'

/**
 * Claves de caché, en jerarquía. Nadie escribe una clave a mano fuera de este
 * archivo.
 *
 * Se cachean la previsualización del vencimiento y el acto que se abre para
 * modificarlo (HU28). Los actos se consultan en la línea de vida, que es de
 * `cases`. Los parámetros van adentro de la clave: otro estado u otra fecha
 * es otro cómputo.
 */
export const proceduralActKeys = {
    all: ['procedural-acts'] as const,
    previews: (caseId: number) => [...proceduralActKeys.all, 'preview', caseId] as const,
    preview: (caseId: number, params: DeadlinePreviewParams) =>
        [...proceduralActKeys.previews(caseId), params] as const,
    details: () => [...proceduralActKeys.all, 'detail'] as const,
    detail: (caseId: number, actId: number) => [...proceduralActKeys.details(), caseId, actId] as const,
}
