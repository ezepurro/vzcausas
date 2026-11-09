import { useId } from 'react'
import { Pill } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { formatPrescription } from '@/features/legal-params'
import type { Case, CaseLegalQualification } from '@/features/cases/types/case'
import { nextToPrescribe } from '@/features/cases/utils/prescription'

export interface CaseQualificationsProps {
    case: Pick<Case, 'jurisdiction' | 'legalQualifications'>
}

/**
 * Las calificaciones legales de la causa, en el encabezado del detalle, debajo
 * de los datos (D-112). No está en el prototipo (`cases/CAMBIOS.md`).
 *
 * Un renglón por delito, por vencimiento: así quedan arriba los que ya
 * prescribieron. Cada uno dice "Prescribió el …", "Próximo a prescribir" —el
 * mismo que muestra la barra— o "Vigente". Todo sale de lo que manda el
 * backend: el front no calcula la prescripción.
 *
 * Sólo en el fuero penal, y sólo si la causa tiene calificaciones: sin
 * ninguna no hay nada que mostrar (tampoco hay barra, D-74). Una calificación
 * dada de baja se sigue mostrando: es parte de la historia de la causa.
 */
export function CaseQualifications({ case: c }: CaseQualificationsProps) {
    const labelId = useId()
    if (c.jurisdiction !== 'CRIMINAL' || c.legalQualifications.length === 0) return null

    const nextId = nextToPrescribe(c)
    const sorted = [...c.legalQualifications].sort(
        (a, b) => a.prescriptionExpiresOn.localeCompare(b.prescriptionExpiresOn) || a.id - b.id,
    )

    return (
        <div className="vz-case-quals">
            <div className="vz-case-quals__label" id={labelId}>Calificaciones legales</div>
            <ul className="vz-case-quals__list" aria-labelledby={labelId}>
                {sorted.map((q) => (
                    <li key={q.id} className="vz-case-quals__item">
                        <span className="vz-case-quals__name">{q.name}</span>
                        <span className="vz-case-quals__term">
                            {formatPrescription(q.prescriptionMonths)} · vence el {formatDate(q.prescriptionExpiresOn)}
                        </span>
                        <QualificationStatus qualification={q} isNext={q.id === nextId} />
                    </li>
                ))}
            </ul>
        </div>
    )
}

function QualificationStatus({ qualification: q, isNext }: { qualification: CaseLegalQualification; isNext: boolean }) {
    if (q.expired) return <Pill tone="danger">Prescribió el {formatDate(q.prescriptionExpiresOn)}</Pill>
    // El próximo va en bronce si ya pasó el 70 %, como la barra.
    if (isNext) return <Pill tone={q.alert ? 'warn' : 'primary'}>Próximo a prescribir</Pill>
    return <Pill tone="neutral">Vigente</Pill>
}
