import { JURISDICTION_LABELS } from '@/features/legal-params'
import { Icon } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { JURISDICTION_DESCRIPTIONS, type JurisdictionSummary } from '@/features/documents/utils/templateFormat'

export interface JurisdictionCardProps {
    summary: JurisdictionSummary
    onOpen: () => void
}

/** La tarjeta de un fuero en la vista general de Modelos (CA-35.11). */
export function JurisdictionCard({ summary, onOpen }: JurisdictionCardProps) {
    return (
        <button type="button" className="vz-jur-card" onClick={onOpen}>
            <div className="vz-jur-card__top">
                <span className="vz-jur-card__icon"><Icon name="folder" size={26} /></span>
                <Icon name="forward" />
            </div>
            <div>
                <div className="vz-jur-card__name">{JURISDICTION_LABELS[summary.jurisdiction]}</div>
                <div className="vz-jur-card__desc">{JURISDICTION_DESCRIPTIONS[summary.jurisdiction]}</div>
            </div>
            <div className="vz-jur-card__foot">
                <span>
                    <b>{summary.count}</b> {summary.count === 1 ? 'modelo vigente' : 'modelos vigentes'}
                </span>
                {/* La fecha va debajo, pero el espacio queda: el texto se lee
                    "Actualizado 21/08/2026" (lectores de pantalla y tests). */}
                <span className="vz-jur-card__updated">
                    Actualizado <b>{formatDate(summary.lastUpdatedOn)}</b>
                </span>
            </div>
        </button>
    )
}
