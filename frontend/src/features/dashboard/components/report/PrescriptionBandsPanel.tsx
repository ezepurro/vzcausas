import { Panel } from '@/shared/components/ui'
import type { MonthlyReportPrescription, PrescriptionBand } from '@/features/dashboard/types/monthlyReport'

const BAND_LABELS: Record<PrescriptionBand, string> = {
    UNDER_50: 'Menos del 50 %',
    FROM_50_TO_70: 'Entre 50 % y 70 %',
    FROM_70_TO_90: 'Entre 70 % y 90 %',
    FROM_90: 'Desde el 90 %',
}

/**
 * "Avance de la prescripción" (CA-43.10): los cuatro tramos de `prescription.bands`.
 *
 * Presentacional: dibuja lo que manda el backend, sin recalcular (D-120).
 * SVG y CSS, sin librería de gráficos.
 */
export function PrescriptionBandsPanel({ prescription, cutoff }: { prescription: MonthlyReportPrescription; cutoff: string }) {
    return (
        <Panel
            title="Avance de la prescripción"
            sub={`${prescription.cases} causas penales activas al ${cutoff}, según el porcentaje del plazo transcurrido.`}
        >
            <div className="vz-panel__body vz-report-body">
                <div className="vz-report-presc">
                    <div className="vz-report-presc__bar" role="img" aria-label="Distribución del avance de la prescripción">
                        {prescription.bands.map((b) => (
                            b.cases > 0 && (
                                <span
                                    key={b.band}
                                    className={`vz-report-band--${b.band}`}
                                    style={{ flex: `${b.cases} 0 0` }}
                                    title={`${BAND_LABELS[b.band]}: ${b.cases}`}
                                />
                            )
                        ))}
                    </div>
                    <ul className="vz-report-legend">
                        {prescription.bands.map((b) => (
                            <li key={b.band} className="vz-report-legend__row">
                                <span className={`vz-report-swatch vz-report-band--${b.band}`} aria-hidden="true" />
                                <span className="vz-report-legend__name">{BAND_LABELS[b.band]}</span>
                                <span className="vz-report-legend__n">{b.cases}</span>
                                <span className="vz-report-legend__pct">{b.percentage} %</span>
                            </li>
                        ))}
                    </ul>
                    <p className="vz-report-note">
                        Desde el 70 % la causa aparece en las alertas de Inicio. Un acto interruptivo reinicia el cómputo.
                    </p>
                </div>
            </div>
        </Panel>
    )
}
