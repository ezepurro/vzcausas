import { Meter, type MeterTone } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import type { CasePrescription } from '@/features/cases/types/case'
import { remainingLabel } from '@/features/cases/utils/prescription'

export interface PrescriptionBarProps {
    /** La que rige la causa: `prescription`, ya resuelta por el backend (V4 D-51). */
    prescription: CasePrescription
    /** Aclaración al pie: desde cuándo corre y, si hay varias, cuál calificación se muestra. */
    note?: string
    /**
     * La fecha en que se declaró prescripta la causa (`prescriptionDeclaration`),
     * si ya lo fue: la barra va en rojo y dice "Prescripta el …" en lugar de lo
     * que resta.
     */
    declaredOn?: string
    /** Para fijar el día en los tests; por defecto, hoy. */
    today?: Date
}

/**
 * "Prescripción de la acción": cuánto del plazo ya pasó, cuánto falta, y las
 * fechas de inicio y de vencimiento. Va al pie del `CaseHeader`, y sólo en las
 * causas penales con calificaciones: en las demás `prescription` vale `null`
 * y es la pantalla la que decide no dibujarla.
 *
 * Desde V4 la calificación que prescribe primero, el porcentaje y la alerta del
 * 70 % llegan calculados en `prescription` (D-51): la barra sólo los muestra.
 * Del lado del front queda el rótulo "Restan 5 años 9 meses", que el contrato
 * pide armar con `expiresOn`.
 *
 * Un plazo cumplido no cambia el estado de la causa (D-52): la barra dice
 * "Plazo cumplido" y la causa sigue activa hasta que alguien la marque como
 * prescripta.
 *
 * Una causa ya marcada prescripta (`declaredOn`) va siempre en rojo y dice
 * "Prescripta el …": la declaración manda sobre el cálculo, que puede no
 * haber cumplido el plazo si se declaró antes. El porcentaje y las fechas
 * siguen siendo los del backend (`cases/CAMBIOS.md`).
 */
export function PrescriptionBar({ prescription, note, declaredOn, today }: PrescriptionBarProps) {
    const { legalQualificationName, startsOn, expiresOn, elapsedPercentage, alert, expired } = prescription
    const tone: MeterTone = declaredOn || expired ? 'danger' : alert ? 'warn' : 'primary'
    const remaining = declaredOn
        ? `Prescripta el ${formatDate(declaredOn)}`
        : expired ? 'Plazo cumplido' : remainingLabel(expiresOn, today)

    return (
        <div className="vz-presc">
            <div className="vz-presc__top">
                <div className="vz-presc__title">
                    Prescripción de la acción{' '}
                    <span className="vz-presc__qualification">· {legalQualificationName}</span>
                </div>
                <div className="vz-presc__remaining">{remaining}</div>
            </div>
            <Meter
                label="Prescripción transcurrida"
                value={elapsedPercentage}
                valueText={`${elapsedPercentage} %`}
                tone={tone}
            />
            <div className="vz-presc__dates">
                <span>{formatDate(startsOn)}</span>
                <span>{formatDate(expiresOn)}</span>
            </div>
            {note && <div className="vz-presc__note">{note}</div>}
        </div>
    )
}
