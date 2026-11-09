import { useId } from 'react'
import { Button, Pill } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { formatPrescription } from '@/features/legal-params'
import type { Case, CaseLegalQualification } from '@/features/cases/types/case'
import { nextToPrescribe } from '@/features/cases/utils/prescription'

/** "Marcar prescripta" de cada calificación (D-113): quién puede y qué pasa al tocarlo. */
export interface QualificationDeclareAction {
    /** `false` para un abogado que no es el responsable (D-110): se ve deshabilitado. */
    enabled: boolean
    /** Por qué está deshabilitado, en el `title`. */
    disabledTitle?: string
    onDeclare: (qualification: CaseLegalQualification) => void
}

export interface CaseQualificationsProps {
    case: Pick<Case, 'jurisdiction' | 'legalQualifications'>
    /**
     * Sin esto no se ofrece declarar: la Secretaría, una causa ya prescripta y
     * "Registrar acto procesal" no lo pasan.
     */
    declare?: QualificationDeclareAction
}

/**
 * Las calificaciones legales de la causa, en el encabezado del detalle, debajo
 * de los datos (D-112). No está en el prototipo (`cases/CAMBIOS.md`).
 *
 * Un renglón por delito, por vencimiento. El estado de cada uno (D-113):
 *
 * - "Prescripta el …": un tribunal la declaró y alguien la cargó.
 * - "Plazo cumplido": se cumplió el plazo calculado, pero falta declararla.
 * - "Próximo a prescribir": el mismo que muestra la barra.
 * - "Vigente": el resto.
 *
 * Cada una sin declarar ofrece "Marcar prescripta" (CA-33.16): se puede
 * declarar aunque el plazo calculado no se haya cumplido, porque la declara el
 * tribunal (CA-33.10). Todo sale de lo que manda el backend: el front no
 * calcula la prescripción.
 *
 * Sólo en el fuero penal, y sólo si la causa tiene calificaciones. Una
 * calificación dada de baja se sigue mostrando: es parte de la historia de la
 * causa.
 */
export function CaseQualifications({ case: c, declare }: CaseQualificationsProps) {
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
                        {declare && q.prescriptionDeclaration === null && (
                            <Button
                                variant="secondary"
                                size="sm"
                                aria-label={`Marcar prescripta: ${q.name}`}
                                disabled={!declare.enabled}
                                title={declare.enabled ? undefined : declare.disabledTitle}
                                onClick={() => declare.onDeclare(q)}
                            >
                                Marcar prescripta
                            </Button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function QualificationStatus({ qualification: q, isNext }: { qualification: CaseLegalQualification; isNext: boolean }) {
    if (q.prescriptionDeclaration) {
        return <Pill tone="neutral">Prescripta el {formatDate(q.prescriptionDeclaration.prescriptionDate)}</Pill>
    }
    if (q.expired) return <Pill tone="danger">Plazo cumplido</Pill>
    // El próximo va en bronce si ya pasó el 70 %, como la barra.
    if (isNext) return <Pill tone={q.alert ? 'warn' : 'primary'}>Próximo a prescribir</Pill>
    return <Pill tone="neutral">Vigente</Pill>
}
