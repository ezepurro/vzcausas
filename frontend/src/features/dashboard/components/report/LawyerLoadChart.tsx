import { Panel } from '@/shared/components/ui'
import { formatPersonName } from '@/shared/lib/personName'
import { JURISDICTION_LABELS, type Jurisdiction } from '@/features/legal-params'
import type { MonthlyReportLawyer } from '@/features/dashboard/types/monthlyReport'
import { formatDecimal } from '@/features/dashboard/utils/reportPeriod'

const LOAD_PARTS: { key: 'criminal' | 'administrative' | 'amparo'; jurisdiction: Jurisdiction }[] = [
    { key: 'criminal', jurisdiction: 'CRIMINAL' },
    { key: 'administrative', jurisdiction: 'ADMINISTRATIVE' },
    { key: 'amparo', jurisdiction: 'AMPARO' },
]

/**
 * "Carga por abogado responsable" (CA-43.9): barras apiladas por fuero, en el orden de `lawyers`, con la línea de `summary.averagePerLawyer`.
 *
 * Presentacional: dibuja lo que manda el backend, sin recalcular (D-120).
 * SVG y CSS, sin librería de gráficos.
 */
export function LawyerLoadChart({ lawyers, average }: { lawyers: MonthlyReportLawyer[]; average: number }) {
    const scale = Math.max(1, average, ...lawyers.map((l) => l.total)) * 1.1
    return (
        <Panel
            title="Carga por abogado responsable"
            sub={`Causas activas desglosadas por fuero. La línea marca el promedio del estudio (${formatDecimal(average)}).`}
            actions={
                <div className="vz-report-legend vz-report-legend--inline">
                    {LOAD_PARTS.map((p) => (
                        <span key={p.key}>
                            <span className={`vz-report-swatch vz-dash-fuero--${p.jurisdiction}`} aria-hidden="true" />
                            {JURISDICTION_LABELS[p.jurisdiction]}
                        </span>
                    ))}
                </div>
            }
        >
            <div className="vz-panel__body vz-report-body">
                {lawyers.length === 0 ? (
                    <p className="vz-report-empty">No hay abogados en el período.</p>
                ) : (
                    <ul className="vz-report-load">
                        {lawyers.map((l) => {
                            const name = formatPersonName(l.lawyer)
                            const detail = `Penal ${l.criminal} · Administrativo ${l.administrative} · Amparo ${l.amparo}`
                            return (
                                <li key={l.lawyer.id} className="vz-report-load__row">
                                    <span className="vz-report-load__name">{name}</span>
                                    <div className="vz-report-load__track" title={detail} aria-label={`${name}: ${detail}`} role="img">
                                        <div className="vz-report-load__bar" style={{ width: `${(l.total / scale) * 100}%` }}>
                                            {LOAD_PARTS.map((p) => (
                                                l[p.key] > 0 && (
                                                    <span key={p.key} className={`vz-dash-fuero--${p.jurisdiction}`} style={{ flex: `${l[p.key]} 0 0` }} />
                                                )
                                            ))}
                                        </div>
                                        <span className="vz-report-load__avg" style={{ left: `${(average / scale) * 100}%` }} aria-hidden="true" />
                                    </div>
                                    <span className="vz-report-load__total">{l.total}</span>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </Panel>
    )
}
