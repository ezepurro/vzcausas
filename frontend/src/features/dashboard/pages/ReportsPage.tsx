import { useSearchParams } from 'react-router'
import { useToast } from '@/app/providers/ToastContext'
import { isApiError } from '@/shared/api/ApiError'
import { Button, Icon, LoadError, LoadingState, PageHeader, Pill, Skeleton } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { usePageTitle } from '@/shared/hooks/usePageTitle'
import { useMonthlyReport } from '@/features/dashboard/api/useMonthlyReport'
import { useDownloadMonthlyReport } from '@/features/dashboard/api/useDownloadMonthlyReport'
import { ReportPeriodPicker } from '@/features/dashboard/components/report/ReportPeriodPicker'
import { ReportKpis } from '@/features/dashboard/components/report/ReportKpis'
import { JurisdictionDonut } from '@/features/dashboard/components/report/JurisdictionDonut'
import { MonthlyFlowChart } from '@/features/dashboard/components/report/MonthlyFlowChart'
import { LawyerLoadChart } from '@/features/dashboard/components/report/LawyerLoadChart'
import { PrescriptionBandsPanel } from '@/features/dashboard/components/report/PrescriptionBandsPanel'
import { isPeriod, periodLabel } from '@/features/dashboard/utils/reportPeriod'

/** El mes elegido va en la URL (`/reportes?periodo=2026-08`): sobrevive a recargar y al botón atrás. */
const PERIOD_PARAM = 'periodo'

/**
 * "Reportes" (HU43, V6 §3.13): el reporte mensual de gestión, solo para el
 * Administrador (CA-43.1; la ruta la cuida `ROUTE_ACCESS`).
 *
 * Sin mes en la URL, el backend elige el último mes cerrado (CA-43.2). El
 * selector va de `availableFrom` a `currentPeriod` (CA-43.3, CA-43.4); el mes
 * en curso se distingue de uno cerrado por `status` (CA-43.6). Todo llega
 * calculado: la pantalla no recalcula nada (CA-43.9). "Descargar PDF" baja el
 * PDF que arma el backend para el mismo mes (CA-43.12).
 *
 * No hay número de reporte, versiones, "Guardar" ni "Regenerar" (D-117).
 */
export function ReportsPage() {
    usePageTitle('Reportes')
    const toast = useToast()
    const [params, setParams] = useSearchParams()
    const raw = params.get(PERIOD_PARAM)
    const chosen = isPeriod(raw) ? raw : null

    const query = useMonthlyReport(chosen)
    const download = useDownloadMonthlyReport()
    const report = query.data

    function changePeriod(period: string) {
        setParams((current) => {
            const next = new URLSearchParams(current)
            next.set(PERIOD_PARAM, period)
            return next
        }, { replace: true })
    }

    function downloadPdf() {
        if (!report) return
        download.mutate(report.period, {
            onSuccess: () => toast('success', `Descargando Reporte_${report.period}.pdf.`),
            onError: (error) => toast('error', isApiError(error) ? error.message : 'Ocurrió un error inesperado.'),
        })
    }

    const cutoff = report ? formatDate(report.dataAsOf) : ''
    const inProgress = report?.status === 'IN_PROGRESS'

    return (
        <>
            <PageHeader
                eyebrow="Administración"
                title="Reportes"
                sub="Información consolidada del portafolio para la dirección del estudio."
                actions={report && (
                    <div className="vz-report-actions">
                        <ReportPeriodPicker
                            period={report.period}
                            availableFrom={report.availableFrom}
                            currentPeriod={report.currentPeriod}
                            onChange={changePeriod}
                        />
                        <Button
                            icon={<Icon name="download" />}
                            disabled={download.isPending || query.isPlaceholderData}
                            onClick={downloadPdf}
                        >
                            {download.isPending ? 'Descargando…' : 'Descargar PDF'}
                        </Button>
                    </div>
                )}
            />

            {query.isPending && (
                <LoadingState label="Cargando el reporte…">
                    <div className="vz-report">
                        <Skeleton shape="block" height={96} />
                        <Skeleton shape="block" height={240} />
                        <Skeleton shape="block" height={240} />
                    </div>
                </LoadingState>
            )}

            {query.isError && (
                <>
                    <LoadError
                        title="No se pudo cargar el reporte"
                        error={query.error}
                        onRetry={() => void query.refetch()}
                        retrying={query.isFetching}
                    />
                    {/* Un mes de la URL sin reporte (404): sin datos no hay
                        selector, así que se ofrece volver al mes por defecto. */}
                    {chosen !== null && isApiError(query.error) && query.error.is('MONTHLY_REPORT_NOT_FOUND') && (
                        <p className="vz-report-note">
                            <Button variant="secondary" size="sm" onClick={() => setParams({}, { replace: true })}>
                                Ver el último mes cerrado
                            </Button>
                        </p>
                    )}
                </>
            )}

            {report && !query.isError && (
                <div className={`vz-report ${query.isPlaceholderData ? 'is-busy' : ''}`} aria-busy={query.isPlaceholderData}>
                    <p className="vz-report-period">
                        <strong>{periodLabel(report.period)}</strong>
                        {inProgress ? (
                            <Pill tone="warn">Mes en curso · datos al {cutoff}</Pill>
                        ) : (
                            <span className="vz-report-period__note">Mes cerrado · datos al {cutoff}</span>
                        )}
                    </p>

                    <ReportKpis report={report} cutoff={cutoff} />

                    {/* Orden decidido el 14/11/2026 (`dashboard/CAMBIOS.md`): fuero y
                        prescripción arriba, ingresadas y archivadas y, al final, la
                        carga por abogado. "Causas por estado procesal" (CA-43.9) no se dibuja. */}
                    <div className="vz-report__row">
                        <JurisdictionDonut items={report.byJurisdiction} total={report.summary.activeCases} cutoff={cutoff} />
                        <PrescriptionBandsPanel prescription={report.prescription} cutoff={cutoff} />
                    </div>

                    <MonthlyFlowChart months={report.monthly} period={report.period} />

                    <LawyerLoadChart lawyers={report.lawyers} average={report.summary.averagePerLawyer} />
                </div>
            )}
        </>
    )
}
