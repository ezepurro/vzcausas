import { Meter } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { prescriptionProgress } from '@/features/cases/utils/prescription'

export interface PrescriptionBarProps {
    /** La calificación que manda: la que vence primero (`nearestQualification`). */
    qualificationName: string
    /** `YYYY-MM-DD`: `prescriptionStartsOn` de la causa. */
    startsOn: string
    /** `YYYY-MM-DD`: `prescriptionExpiresOn` de la calificación. */
    expiresOn: string
    /** Aclaración al pie, si la pantalla tiene algo que decir. */
    note?: string
    /** Para fijar el día en los tests; por defecto, hoy. */
    today?: Date
}

/**
 * "Prescripción de la acción": cuánto del plazo ya pasó, cuánto falta, y las
 * fechas de inicio y de vencimiento. Va al pie del `CaseHeader`, y sólo en las
 * causas penales: fuera del penal la prescripción no aplica (V3 D-19), y es la
 * pantalla la que decide no dibujarla.
 */
export function PrescriptionBar({
    qualificationName, startsOn, expiresOn, note, today,
}: PrescriptionBarProps) {
    const progress = prescriptionProgress(startsOn, expiresOn, today)
    if (!progress) return null

    return (
        <div className="vz-presc">
            <div className="vz-presc__top">
                <div className="vz-presc__title">
                    Prescripción de la acción{' '}
                    <span className="vz-presc__qualification">· {qualificationName}</span>
                </div>
                <div className="vz-presc__remaining">{progress.remaining}</div>
            </div>
            <Meter
                label="Prescripción transcurrida"
                value={progress.percent}
                valueText={`${progress.percent} %`}
                tone={progress.tone}
            />
            <div className="vz-presc__dates">
                <span>{formatDate(startsOn)}</span>
                <span>{formatDate(expiresOn)}</span>
            </div>
            {note && <div className="vz-presc__note">{note}</div>}
        </div>
    )
}
