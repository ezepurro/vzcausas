import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usePrefetchPage } from '@/shared/api/usePrefetchPage';
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
export function useLegalQualifications(params: LegalQualificationListParams) {
    return useQuery({
        queryKey: legalQualificationKeys.list(params),
        queryFn: () => listLegalQualifications(params),
        placeholderData: keepPreviousData,
    });
}

/** Pide de antemano otra página del listado, con la misma búsqueda (`usePrefetchPage`). */
export function usePrefetchLegalQualificationsPage(params: LegalQualificationListParams) {
    return usePrefetchPage((page) => ({
        queryKey: legalQualificationKeys.list({ ...params, page }),
        queryFn: () => listLegalQualifications({ ...params, page }),
    }));
}
