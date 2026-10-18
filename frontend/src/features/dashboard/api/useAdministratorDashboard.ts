import { useQuery } from '@tanstack/react-query'
import { getAdministratorDashboard } from '@/features/dashboard/api/dashboards.api'
import { dashboardKeys } from '@/features/dashboard/api/dashboards.keys'

export function useAdministratorDashboard({enabled=true}: {enabled?: boolean} = {}) {
    return useQuery({
        queryKey: dashboardKeys.administrator(),
        queryFn: getAdministratorDashboard,
        enabled,
        staleTime: 0
    })
}