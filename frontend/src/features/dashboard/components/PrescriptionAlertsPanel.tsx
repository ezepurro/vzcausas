import { Meter, Panel } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { formatPersonName } from '@/shared/lib/personName'
import type { PrescriptionAlert } from '@/features/dashboard/types/dashboard'

interface PrescriptionAlertsPanelProps {
    /** Ya vienen ordenadas: primero la que prescribe antes. */
    alerts: PrescriptionAlert[]
    onOpen: (caseId: number) => void
    /** En "Estudio" cada alerta dice quién es el responsable. */
    showLawyer?: boolean
}

/**
 * "Alertas de prescripción" (CA-41.5, CA-42.5): las causas penales con el
 * 70 % o más de su plazo de prescripción transcurrido. El porcentaje lo
 * calcula el backend (D-51); acá sólo se dibuja.
 */
export function PrescriptionAlertsPanel({ alerts, onOpen, showLawyer = false }: PrescriptionAlertsPanelProps) {
    return (
        <Panel title="Alertas de prescripción">
            {alerts.length === 0 ? (
                <div className="vz-empty">
                    <div className="vz-empty__text">Ninguna causa superó el 70 % de su plazo de prescripción.</div>
                </div>
            ) : (
                <ul className="vz-dash-rows">
                    {alerts.map((alert) => (
                        <li key={alert.caseId}>
                            <button type="button" className="vz-dash-alert" onClick={() => onOpen(alert.caseId)}>
                                <div className="vz-dash-alert__head">
                                    <span className="vz-dash-alert__caption">{alert.caption}</span>
                                    <span className="vz-dash-alert__expires">
                                        {alert.expired ? 'Prescripta' : `Prescribe el ${formatDate(alert.expiresOn)}`}
                                    </span>
                                </div>
                                <div className="vz-dash-alert__meta">
                                    {alert.legalQualificationName}
                                    {showLawyer && ` · ${formatPersonName(alert.responsibleLawyer)}`}
                                </div>
                                <Meter
                                    value={alert.elapsedPercentage}
                                    label="Prescripción transcurrida"
                                    valueText={`${alert.elapsedPercentage} %`}
                                    tone={alert.expired ? 'danger' : 'warn'}
                                />
                                <div className="vz-dash-alert__foot">
                                    <span>{alert.elapsedPercentage} % transcurrido</span>
                                    <span>aviso al 70 %</span>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    )
}