import type { DeadlinePreviewParams } from '@/features/proceedings/types/proceduralAct'

/**
 * Claves de caché, en jerarquía. Nadie escribe una clave a mano fuera de este
 * archivo.
 *
 * En este sprint sólo se cachea la previsualización del vencimiento: no hay
 * endpoint para listar ni para leer actos (HU27, Sprint 3). Los parámetros van
 * adentro de la clave: otro estado u otra fecha es otro cómputo.
 */
export const proceduralActKeys = {
    all: ['procedural-acts'] as const,
    previews: (caseId: number) => [...proceduralActKeys.all, 'preview', caseId] as const,
    preview: (caseId: number, params: DeadlinePreviewParams) =>
        [...proceduralActKeys.previews(caseId), params] as const,
}
