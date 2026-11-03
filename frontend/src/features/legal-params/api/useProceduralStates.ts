import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usePrefetchNextPage } from '@/shared/api/usePrefetchNextPage';
import type { ProceduralStatesParams } from '@/features/legal-params/types/proceduralState';
import { listProceduralStates } from './proceduralStates.api';
import { proceduralStateKeys } from './proceduralStates.keys';

/**
 * Listado paginado y filtrable de estados procesales.
 *
 * `keepPreviousData` deja la tabla anterior en pantalla mientras llega la
 * página nueva, en vez de vaciarla y volver a llenarla. Sin eso, cambiar de
 * página o escribir en el buscador hace saltar la altura de la tabla en cada
 * tecla. Se distingue del estado de carga inicial con `isPlaceholderData`.
 */
export function useProceduralStates(params: ProceduralStatesParams, { prefetchNext = false } = {}) {
    const query = useQuery({
        queryKey: proceduralStateKeys.list(params),
        queryFn: () => listProceduralStates(params),
        placeholderData: keepPreviousData,
    });
    // Sólo las tablas lo piden; los desplegables no pasan de la primera página.
    usePrefetchNextPage(
        query.isPlaceholderData ? undefined : query.data?.pagination,
        (page) => ({ queryKey: proceduralStateKeys.list({ ...params, page }), queryFn: () => listProceduralStates({ ...params, page }) }),
        prefetchNext,
    );
    return query;
}
