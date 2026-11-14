/** El reporte mensual de gestión (HU43, V6 §3.13). */

import type { ApiItem } from '@/api-contract/envelopes'
import { FILE_TRANSFER_TIMEOUT_MS, http } from '@/shared/api/http'
import type { MonthlyReport } from '@/features/dashboard/types/monthlyReport'

const RESOURCE = '/reports/monthly'

/** Sin `period`, el backend devuelve el último mes cerrado (o el en curso, si no hay ninguno). */
export async function getMonthlyReport(period?: string): Promise<MonthlyReport> {
    const response = await http.get<ApiItem<MonthlyReport>>(RESOURCE, {
        params: { period: period || undefined },
    })
    return response.data.data
}

/** "Descargar PDF": el PDF lo arma el backend; el front solo lo baja. */
export async function downloadMonthlyReportFile(period: string): Promise<Blob> {
    const response = await http.get<Blob>(`${RESOURCE}/file`, {
        params: { period, disposition: 'attachment' },
        responseType: 'blob',
        timeout: FILE_TRANSFER_TIMEOUT_MS,
    })
    return response.data
}
