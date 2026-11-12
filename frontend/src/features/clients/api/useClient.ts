import { useQuery } from '@tanstack/react-query'
import { getClient } from '@/features/clients/api/clients.api'
import { clientKeys } from '@/features/clients/api/clients.keys'

/**
 * Un cliente por su id (`GET /clients/{clientId}`). Con `null` no pide nada.
 *
 * Lo usa el selector de cliente del alta de causa para mostrar al elegido
 * aunque no esté entre los que trajo la búsqueda: el listado llega de a 100.
 * Un cliente recién registrado ya está en la caché (`useCreateClient` siembra
 * su detalle), así que no se vuelve a pedir.
 */
export function useClient(id: number | null) {
    return useQuery({
        queryKey: clientKeys.detail(id ?? 0),
        queryFn: () => getClient(id as number),
        enabled: id !== null,
    })
}
