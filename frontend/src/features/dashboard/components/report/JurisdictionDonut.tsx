import { Panel } from '@/shared/components/ui'
import { JURISDICTION_LABELS } from '@/features/legal-params'
import type { MonthlyReportJurisdiction } from '@/features/dashboard/types/monthlyReport'

const DONUT_R = 60
const DONUT_STROKE = 22
const CIRCUMFERENCE = 2 * Math.PI * DONUT_R

/**
 * "Causas activas por fuero" (CA-43.9): una dona SVG con `byJurisdiction[].atEnd` y su `percentage`.
 *
 * Presentacional: dibuja lo que manda el backend, sin recalcular (D-120).
 * SVG y CSS, sin librería de gráficos.
 */
export function JurisdictionDonut({ items, total, cutoff }: {
    items: MonthlyReportJurisdiction[]
    total: number
    cutoff: string
}) {
    let offset = 0
    const aria = items.map((i) => `${JURISDICTION_LABELS[i.jurisdiction]} ${i.atEnd}`).join(', ')
    return (
        <Panel title="Causas activas por fuero" sub={`Al ${cutoff}`}>
            <div className="vz-panel__body vz-report-body">
                <div className="vz-report-donut">
                    <svg viewBox="0 0 160 160" className="vz-report-donut__svg" role="img" aria-label={aria}>
                        <circle cx="80" cy="80" r={DONUT_R} className="vz-report-donut__track" strokeWidth={DONUT_STROKE} fill="none" />
                        {total > 0 && items.map((item) => {
                            const length = (item.atEnd / total) * CIRCUMFERENCE
                            const dash = `${length} ${CIRCUMFERENCE - length}`
                            const circle = (
                                <circle
                                    key={item.jurisdiction}
                                    cx="80"
                                    cy="80"
                                    r={DONUT_R}
                                    fill="none"
                                    strokeWidth={DONUT_STROKE}
                                    strokeDasharray={dash}
                                    strokeDashoffset={-offset}
                                    className={`vz-report-stroke--${item.jurisdiction}`}
                                    transform="rotate(-90 80 80)"
                                />
                            )
                            offset += length
                            return circle
                        })}
                        <text x="80" y="78" textAnchor="middle" className="vz-report-donut__total">{total}</text>
                        <text x="80" y="98" textAnchor="middle" className="vz-report-donut__caption">activas</text>
                    </svg>
                    <ul className="vz-report-legend">
                        {items.map((item) => (
                            <li key={item.jurisdiction} className="vz-report-legend__row">
                                <span className={`vz-report-swatch vz-dash-fuero--${item.jurisdiction}`} aria-hidden="true" />
                                <span className="vz-report-legend__name">{JURISDICTION_LABELS[item.jurisdiction]}</span>
                                <span className="vz-report-legend__n">{item.atEnd}</span>
                                <span className="vz-report-legend__pct">{item.percentage} %</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Panel>
    )
}
