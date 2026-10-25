import { useQuery } from '@tanstack/react-query'
import { getLawyerDashboard } from '@/features/dashboard/api/dashboards.api'
import { dashboardKeys } from '@/features/dashboard/api/dashboards.keys'
/**
 * `enabled` lo decide la página según el rol: a quien no es abogado el
 * backend le responde `403`, así que la consulta no sale.
 *
 * `staleTime: 0` porque el tablero tiene que estar siempre al día (CA-41.9):
 * cada vez que se entra a Inicio se vuelve a pedir, y un acto recién
 * registrado ya aparece. Sin esto valdría el `staleTime` de 60 s del
 * `queryClient`.
 */

export function useLawyerDashboard({enabled=true}: {enabled?: boolean} = {}) {
    return useQuery({
        queryKey: dashboardKeys.lawyer(),
        queryFn: getLawyerDashboard,
        enabled,
        staleTime: 0
    })
}