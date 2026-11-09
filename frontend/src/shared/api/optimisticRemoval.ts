import type { QueryClient, QueryKey } from '@tanstack/react-query'
import type { ApiList } from '@/api-contract/envelopes'

/** Lo que había en cada listado antes de sacar la fila, para devolverlo si la baja falla. */
export type ListsSnapshot = ReadonlyArray<[QueryKey, unknown]>

/**
 * Saca un registro de todos los listados en caché antes de que responda el
 * servidor, para que la fila desaparezca al confirmar la baja.
 *
 * Se usa en el `onMutate` de una baja; el `onError` llama a `restoreLists`
 * con lo que devuelve, y el `onSettled` invalida los listados igual que antes:
 * la página tiene que volver a llenarse con la fila que sube de la siguiente,
 * y `totalItems` lo cuenta el backend.
 *
 * Primero cancela los pedidos de listados en vuelo: uno que salió antes de la
 * baja volvería con la fila y la pondría de nuevo.
 */
export async function removeFromLists(
    queryClient: QueryClient,
    listsKey: QueryKey,
    id: number,
): Promise<ListsSnapshot> {
    await queryClient.cancelQueries({ queryKey: listsKey })
    const snapshot = queryClient.getQueriesData({ queryKey: listsKey })

    queryClient.setQueriesData<ApiList<{ id: number }>>({ queryKey: listsKey }, (old) => {
        // Cuelgan otras cosas de `lists()` (los estados custom de causas, por ejemplo).
        if (!old || !Array.isArray(old.data) || !old.data.some((row) => row.id === id)) return old
        return {
            data: old.data.filter((row) => row.id !== id),
            pagination: { ...old.pagination, totalItems: old.pagination.totalItems - 1 },
        }
    })
    return snapshot
}

/** Devuelve los listados a como estaban: la baja falló y la fila vuelve. */
export function restoreLists(queryClient: QueryClient, snapshot: ListsSnapshot | undefined) {
    snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data))
}
