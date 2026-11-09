import type { Case } from '@/features/cases/types/case'
import { prescriptionNote, shownPrescription } from '@/features/cases/utils/prescription'
import { PrescriptionBar } from './PrescriptionBar'

export interface CasePrescriptionBarProps {
    case: Pick<Case, 'prescription' | 'legalQualifications' | 'prescriptionDeclaration'>
}

/**
 * La prescripción al pie del encabezado de la causa, en el detalle y en
 * "Registrar acto procesal": las dos pantallas muestran lo mismo.
 *
 * Mientras la calificación que rige no prescribió, es la de `prescription`.
 * Cuando prescribió, la próxima a prescribir; y si prescribieron todas, un
 * aviso en lugar de la barra (D-112, `shownPrescription`). Fuera del penal o
 * sin calificaciones no dibuja nada (D-74).
 */
export function CasePrescriptionBar({ case: c }: CasePrescriptionBarProps) {
    const shown = shownPrescription(c)
    if (shown === null) return null
    if (shown.kind === 'allExpired') {
        return (
            <div className="vz-presc">
                <div className="vz-presc__done">Todos los delitos prescribieron.</div>
            </div>
        )
    }
    return <PrescriptionBar prescription={shown.prescription} note={prescriptionNote(c, shown)} />
}
