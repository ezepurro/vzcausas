import { useQueries } from '@tanstack/react-query';
import { isApiError } from '@/shared/api/ApiError';
import type { LegalQualification } from '@/features/legal-params/types/legalQualification';
import { getLegalQualification } from './legalQualifications.api';
import { legalQualificationKeys } from './legalQualifications.keys';

/** Cómo quedó la consulta de una calificación pedida por su id. */
export interface LegalQualificationLookup {
    id: number;
    /** La calificación, o `undefined` mientras llega o si no existe. */
    qualification: LegalQualification | undefined;
    /** El servidor respondió `404`: se dio de baja o nunca existió. */
    missing: boolean;
}

/**
 * Varias calificaciones por su id (`GET /legal-qualifications/{id}`, una
 * consulta por cada una).
 *
 * Es para las **elegidas** en una causa: el listado llega de a 100 y con una
 * búsqueda aplicada, así que no sirve para saber el nombre de una elegida ni
 * si sigue vigente. "Dada de baja" es el `404` de esta consulta, no que falte
 * en la página del listado.
 */
export function useLegalQualificationsByIds(ids: number[]): LegalQualificationLookup[] {
    return useQueries({
        queries: ids.map((id) => ({
            queryKey: legalQualificationKeys.detail(id),
            queryFn: () => getLegalQualification(id),
        })),
        combine: (results) =>
            results.map((result, i) => ({
                id: ids[i],
                qualification: result.data,
                missing: isApiError(result.error) && result.error.isNotFound,
            })),
    });
}
