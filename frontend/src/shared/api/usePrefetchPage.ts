import { useQueryClient, type FetchQueryOptions, type QueryKey } from '@tanstack/react-query'

/**
 * Pide de antemano una página de un listado. Se llama cuando el usuario
 * apunta a "Siguiente" (`Pagination`, con `useHoverIntent`): el click suele
 * llegar unos cientos de milisegundos después, y ese tiempo ya queda ganado.
 *
 * No se pide sola al cargar cada página: con el buscador, cada término
 * pediría también su página 2, que casi nadie mira, y el límite de pedidos
 * del backend es por IP, compartido por todo el estudio.
 *
 * - Usa la misma clave que el hook del listado: si el pedido todavía está en
 *   vuelo cuando llega el click, la tabla lo espera en vez de mandar otro.
 * - Una página ya en caché y fresca (`staleTime`) no se vuelve a pedir.
 * - Si falla, no pasa nada: al cambiar de página se vuelve a pedir.
 */
export function usePrefetchPage<T>(
    optionsFor: (page: number) => FetchQueryOptions<T, Error, T, QueryKey>,
): (page: number) => void {
    const queryClient = useQueryClient()
    return (page) => {
        void queryClient.prefetchQuery(optionsFor(page))
    }
}
