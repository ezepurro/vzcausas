import { Meter } from '@/shared/components/ui'
import type { Case, CaseLegalQualification } from '@/features/cases/types/case'
import { otherPrescriptionAlerts, prescriptionNote, shownPrescription } from '@/features/cases/utils/prescription'
import { PrescriptionBar } from './PrescriptionBar'

export interface CasePrescriptionBarProps {
    case: Pick<Case, 'prescription' | 'legalQualifications' | 'prescriptionDeclaration'>
}

/**
 * La prescripción al pie del encabezado de la causa, en el detalle y en
 * "Registrar acto procesal": las dos pantallas muestran lo mismo.
 *
 * La barra principal es la calificación más cercana a prescribir entre las
 * que no fueron declaradas (D-112, D-113, `shownPrescription`). Si todas las
 * que faltan declarar cumplieron su plazo, un aviso en lugar de la barra.
 *
 * Debajo, barras chicas con las otras sin declarar que pasaron el 70 %
 * (CA-32.13): en bronce las que corren, en rojo las que cumplieron su plazo y
 * falta declarar. En una causa ya prescripta no van: está cerrada.
 *
 * Fuera del penal o sin calificaciones no dibuja nada (D-74).
 */
export function CasePrescriptionBar({ case: c }: CasePrescriptionBarProps) {
    const shown = shownPrescription(c)
    if (shown === null) return null

    const shownId = shown.kind === 'allExpired' ? null : shown.prescription.legalQualificationId
    const others = c.prescriptionDeclaration === null ? otherPrescriptionAlerts(c, shownId) : []

    return (
        <>
            {shown.kind === 'allExpired' ? (
                <div className="vz-presc">
                    <div className="vz-presc__done">Todos los delitos que faltan declarar cumplieron su plazo.</div>
                </div>
            ) : (
                <PrescriptionBar prescription={shown.prescription} note={prescriptionNote(c, shown)} />
            )}
            {others.length > 0 && (
                <ul className="vz-presc-others" aria-label="Otras calificaciones en alerta de prescripción">
                    {others.map((q) => <OtherAlert key={q.id} qualification={q} />)}
                </ul>
            )}
        </>
    )
}

/** Una barra chica: nombre, la barra fina y el porcentaje, o "Plazo cumplido" si falta declararla. */
function OtherAlert({ qualification: q }: { qualification: CaseLegalQualification }) {
    const text = q.expired ? 'Plazo cumplido · falta declararla' : `${q.elapsedPercentage} %`
    return (
        <li className="vz-presc-others__item">
            <span className="vz-presc-others__name">{q.name}</span>
            <span className="vz-presc-others__meter">
                <Meter
                    label={`Prescripción transcurrida de ${q.name}`}
                    value={q.elapsedPercentage}
                    valueText={text}
                    tone={q.expired ? 'danger' : 'warn'}
                />
            </span>
            <span className={`vz-presc-others__value${q.expired ? ' is-expired' : ''}`}>{text}</span>
        </li>
    )
}
