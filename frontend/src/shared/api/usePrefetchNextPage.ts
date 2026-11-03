import { useEffect } from 'react'
import { hashKey, useQueryClient, type FetchQueryOptions, type QueryKey } from '@tanstack/react-query'
import type { Pagination } from '@/api-contract/envelopes'

/**
 * Pide de antemano la página siguiente de un listado, así "Siguiente" la
 * muestra sin esperar.
 *
 * Se pide una sola página, y sólo cuando la actual ya llegó: mientras
 * `keepPreviousData` muestra la anterior, `pagination` es la de esa página
 * vieja y el siguiente de ella es la que se está pidiendo. Por eso el que la
 * llama le pasa `undefined` mientras `isPlaceholderData`.
 *
 * Una página ya en caché y fresca (`staleTime`) no se vuelve a pedir: ir y
 * volver entre la 1 y la 2 no suma pedidos.
 *
 * Es opt-in: los listados que se piden para llenar un desplegable no lo usan.
 */
export function usePrefetchNextPage<T>(
    pagination: Pagination | undefined,
    optionsFor: (page: number) => FetchQueryOptions<T, Error, T, QueryKey>,
    enabled = true,
) {
    const queryClient = useQueryClient()
    const next =
        enabled && pagination !== undefined && pagination.page < pagination.totalPages
            ? optionsFor(pagination.page + 1)
            : undefined
    // La clave dice qué pedir: con otro filtro, la "página 2" es otra.
    const nextKey = next === undefined ? undefined : hashKey(next.queryKey)

    useEffect(() => {
        if (next !== undefined) void queryClient.prefetchQuery(next)
        // `next` es un objeto nuevo en cada render; lo que importa es su clave.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryClient, nextKey])
}
