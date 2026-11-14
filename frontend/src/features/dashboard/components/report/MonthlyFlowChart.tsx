import { Panel } from '@/shared/components/ui'
import type { MonthlyReportMonth } from '@/features/dashboard/types/monthlyReport'
import { monthName, periodLabel, shortMonth } from '@/features/dashboard/utils/reportPeriod'

/** Lo que ocupa el número arriba de cada barra: la barra más alta deja ese lugar libre. */
const VALUE_SPACE = '16px'

/**
 * "Causas ingresadas y archivadas por mes" (CA-43.9): `monthly`, de enero al
 * período, con el período resaltado. Un mes sin reporte dice "sin datos
 * todavía".
 *
 * Cada barra lleva su cantidad arriba, y debajo del gráfico va el detalle del
 * mes resaltado (`admitted`, `archived`, `balance`, `activeAtEnd`): sin
 * números, eran barras de colores sin escala (14/11/2026, `dashboard/CAMBIOS.md`).
 *
 * Presentacional: dibuja lo que manda el backend, sin recalcular (D-120).
 * SVG y CSS, sin librería de gráficos.
 */
export function MonthlyFlowChart({ months, period }: { months: MonthlyReportMonth[]; period: string }) {
    const max = Math.max(1, ...months.flatMap((m) => [m.admitted ?? 0, m.archived ?? 0]))
    const current = months.find((m) => m.period === period)
    const height = (n: number | null) => `calc((100% - ${VALUE_SPACE}) * ${(n ?? 0) / max})`

    return (
        <Panel
            title="Causas ingresadas y archivadas por mes"
            sub={`Enero a ${monthName(period)} de ${period.slice(0, 4)}. Resaltado: ${monthName(period)}.`}
            actions={
                <div className="vz-report-legend vz-report-legend--inline">
                    <span><span className="vz-report-swatch vz-report-fill--admitted" aria-hidden="true" />Ingresadas</span>
                    <span><span className="vz-report-swatch vz-report-fill--archived" aria-hidden="true" />Archivadas</span>
                </div>
            }
        >
            <div className="vz-panel__body vz-report-body">
                <ul className="vz-report-bars" aria-label="Ingresadas y archivadas por mes">
                    {months.map((m) => {
                        const noData = m.admitted === null
                        const label = noData
                            ? `${periodLabel(m.period)}: sin datos todavía`
                            : `${periodLabel(m.period)}: ${m.admitted} ingresadas, ${m.archived} archivadas`
                        return (
                            <li
                                key={m.period}
                                className={`vz-report-bars__month ${m.period === period ? 'is-current' : ''}`}
                                title={label}
                                aria-label={label}
                            >
                                <div className="vz-report-bars__plot" aria-hidden="true">
                                    {noData ? (
                                        <span className="vz-report-bars__nodata">—</span>
                                    ) : (
                                        <>
                                            <span className="vz-report-bars__col">
                                                <span className="vz-report-bars__value">{m.admitted}</span>
                                                <span className="vz-report-bars__bar vz-report-fill--admitted" style={{ height: height(m.admitted) }} />
                                            </span>
                                            <span className="vz-report-bars__col">
                                                <span className="vz-report-bars__value">{m.archived}</span>
                                                <span className="vz-report-bars__bar vz-report-fill--archived" style={{ height: height(m.archived) }} />
                                            </span>
                                        </>
                                    )}
                                </div>
                                <span className="vz-report-bars__label" aria-hidden="true">{shortMonth(m.period)}</span>
                            </li>
                        )
                    })}
                </ul>

                {current && current.admitted !== null && (
                    <dl className="vz-report-flow-detail" aria-label={`Detalle de ${monthName(period)}`}>
                        <div><dt>Ingresadas</dt><dd>{current.admitted}</dd></div>
                        <div><dt>Archivadas</dt><dd>{current.archived}</dd></div>
                        <div>
                            <dt>Saldo</dt>
                            <dd>{(current.balance ?? 0) > 0 ? `+${current.balance}` : current.balance}</dd>
                        </div>
                        <div><dt>Activas al cierre</dt><dd>{current.activeAtEnd}</dd></div>
                    </dl>
                )}
            </div>
        </Panel>
    )
}
