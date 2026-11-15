/** `GET /reports/monthly` (HU43). */

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getMonthlyReport } from '@/features/dashboard/api/reports.api'
import { dashboardKeys } from '@/features/dashboard/api/dashboards.keys'

/**
 * `period` en `null` deja que el backend elija el mes (CA-43.2). Al cambiar de
 * mes se ve el anterior hasta que llega el nuevo. Un mes cerrado no cambia,
 * pero el mes en curso sí: se vuelve a pedir al entrar, como los tableros.
 */
export function useMonthlyReport(period: string | null) {
    return useQuery({
        queryKey: dashboardKeys.monthlyReport(period),
        queryFn: () => getMonthlyReport(period ?? undefined),
        placeholderData: keepPreviousData,
        staleTime: 0,
        // Un 404 (período sin reporte) no se arregla reintentando.
        retry: false,
    })
}
