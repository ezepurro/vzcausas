import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usePrefetchNextPage } from '@/shared/api/usePrefetchNextPage';
import type { LegalQualificationListParams } from '@/features/legal-params/types/legalQualification';
import { listLegalQualifications } from './legalQualifications.api';
import { legalQualificationKeys } from './legalQualifications.keys';

/**
 * Listado paginado de las calificaciones legales vigentes, en orden
 * alfabético (lo resuelve el backend).
 *
 * `keepPreviousData` deja la tabla anterior en pantalla mientras llega la
 * página o la búsqueda nueva, así no salta la altura en cada tecla.
 */
export function useLegalQualifications(params: LegalQualificationListParams, { prefetchNext = false } = {}) {
    const query = useQuery({
        queryKey: legalQualificationKeys.list(params),
        queryFn: () => listLegalQualifications(params),
        placeholderData: keepPreviousData,
    });
    // Sólo las tablas lo piden; los desplegables no pasan de la primera página.
    usePrefetchNextPage(
        query.isPlaceholderData ? undefined : query.data?.pagination,
        (page) => ({ queryKey: legalQualificationKeys.list({ ...params, page }), queryFn: () => listLegalQualifications({ ...params, page }) }),
        prefetchNext,
    );
    return query;
}
