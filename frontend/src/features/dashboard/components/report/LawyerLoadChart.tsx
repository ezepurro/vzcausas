import { Panel } from '@/shared/components/ui'
import { formatPersonName } from '@/shared/lib/personName'
import { JURISDICTION_LABELS, type Jurisdiction } from '@/features/legal-params'
import type { MonthlyReportLawyer, MonthlyReportUnassigned } from '@/features/dashboard/types/monthlyReport'
import { formatDecimal } from '@/features/dashboard/utils/reportPeriod'

const LOAD_PARTS: { key: 'criminal' | 'administrative' | 'amparo'; jurisdiction: Jurisdiction }[] = [
    { key: 'criminal', jurisdiction: 'CRIMINAL' },
    { key: 'administrative', jurisdiction: 'ADMINISTRATIVE' },
    { key: 'amparo', jurisdiction: 'AMPARO' },
]

/**
 * "Carga por abogado responsable" (CA-43.9): barras apiladas por fuero, en el orden de `lawyers`, con la línea de `summary.averagePerLawyer`.
 *
 * Al final, el renglón "Sin asignar": las causas huérfanas, sin responsable
 * (D-145). No es un abogado: no lleva la línea del promedio, y con cero no se
 * dibuja. Con él, la suma de las barras da `summary.activeCases`.
 *
 * Presentacional: dibuja lo que manda el backend, sin recalcular (D-120).
 * SVG y CSS, sin librería de gráficos.
 */
export function LawyerLoadChart({ lawyers, unassigned, average }: { lawyers: MonthlyReportLawyer[]; unassigned: MonthlyReportUnassigned; average: number }) {
    const scale = Math.max(1, average, unassigned.total, ...lawyers.map((l) => l.total)) * 1.1
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
                {lawyers.length === 0 && unassigned.total === 0 ? (
                    <p className="vz-report-empty">No hay abogados en el período.</p>
                ) : (
                    <ul className="vz-report-load">
                        {lawyers.map((l) => (
                            <LoadRow key={l.lawyer.id} name={formatPersonName(l.lawyer)} load={l} scale={scale} average={average} />
                        ))}
                        {unassigned.total > 0 && (
                            <LoadRow name="Sin asignar" load={unassigned} scale={scale} unassigned />
                        )}
                    </ul>
                )}
            </div>
        </Panel>
    )
}

interface LoadRowProps {
    name: string
    load: MonthlyReportUnassigned
    scale: number
    /** La línea del promedio. El renglón "Sin asignar" no la lleva (D-145). */
    average?: number
    unassigned?: boolean
}

/** Un renglón: el nombre, la barra apilada por fuero y el total. */
function LoadRow({ name, load, scale, average, unassigned = false }: LoadRowProps) {
    const detail = `Penal ${load.criminal} · Administrativo ${load.administrative} · Amparo ${load.amparo}`
    return (
        <li className={`vz-report-load__row${unassigned ? ' vz-report-load__row--unassigned' : ''}`}>
            <span className="vz-report-load__name">{name}</span>
            <div className="vz-report-load__track" title={detail} aria-label={`${name}: ${detail}`} role="img">
                <div className="vz-report-load__bar" style={{ width: `${(load.total / scale) * 100}%` }}>
                    {LOAD_PARTS.map((p) => (
                        load[p.key] > 0 && (
                            <span key={p.key} className={`vz-dash-fuero--${p.jurisdiction}`} style={{ flex: `${load[p.key]} 0 0` }} />
                        )
                    ))}
                </div>
                {average !== undefined && (
                    <span className="vz-report-load__avg" style={{ left: `${(average / scale) * 100}%` }} aria-hidden="true" />
                )}
            </div>
            <span className="vz-report-load__total">{load.total}</span>
        </li>
    )
}
