/** "Descargar PDF" del reporte mensual (CA-43.12): `GET /reports/monthly/file`. */

import { useMutation } from '@tanstack/react-query'
import { saveFile } from '@/shared/lib/saveFile'
import { downloadMonthlyReportFile } from '@/features/dashboard/api/reports.api'

export function useDownloadMonthlyReport() {
    return useMutation({
        mutationFn: async (period: string) => {
            const file = await downloadMonthlyReportFile(period)
            saveFile(file, `Reporte_${period}.pdf`)
        },
    })
}
