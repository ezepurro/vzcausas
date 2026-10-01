import { Fragment, type ReactNode } from 'react'
import { JURISDICTION_LABELS } from '@/features/legal-params'
import { PROCEDURAL_ROLE_LABELS, type Case } from '@/features/cases/types/case'
import { caseStateLabel } from '@/features/cases/utils/caseState'

export interface CaseHeaderProps {
    case: Case
    /** El detalle muestra el instructor y su interno; el acto no. */
    showInstructor?: boolean
    /** Debajo del estado actual: "Registrar acto procesal" en el detalle. */
    actions?: ReactNode
    /** Al pie de la tarjeta: la barra de prescripción, en las causas penales. */
    children?: ReactNode
}

/**
 * El encabezado de una causa: SAC, carátula, tribunal, fuero, rol,
 * responsable y el estado procesal actual. Lo comparten el Detalle (HU22) y
 * Registrar acto procesal (HU26), por eso vive acá y se publica en el
 * `index.ts`.
 *
 * Una causa recién registrada todavía no tiene estado (`currentState` en
 * `null`): el recuadro muestra "Sin acto procesal" hasta que se registre su
 * primer acto, que es el que lo fija (V3 D-09).
 *
 * Los botones "Modificar causa" y "Dar de baja" del prototipo no están: son
 * HU19 y HU21, del Sprint 3 (V3 §8.3). Tampoco "Sobre la causa".
 */
export function CaseHeader({ case: c, showInstructor = false, actions, children }: CaseHeaderProps) {
    const meta: ReactNode[] = [
        c.court,
        <>Fuero <b>{JURISDICTION_LABELS[c.jurisdiction]}</b></>,
        <>Rol <b>{PROCEDURAL_ROLE_LABELS[c.proceduralRole]}</b></>,
        <>Responsable <b>{c.responsibleLawyer.fullName}</b></>,
    ].filter(Boolean)

    const instructor: ReactNode[] = showInstructor
        ? [
            c.instructorName && <>Instructor <b>{c.instructorName}</b></>,
            c.instructorPhone && <>Interno <b className="vz-mono">{c.instructorPhone}</b></>,
        ].filter(Boolean)
        : []

    return (
        <section className="vz-case-head" aria-label={`Causa ${c.sacNumber}`}>
            <div className="vz-case-head__top">
                <div className="vz-case-head__main">
                    <div className="vz-case-head__sac">SAC {c.sacNumber}</div>
                    <h1 className="vz-case-head__title">{c.caption}</h1>
                    <MetaRow items={meta} />
                    {instructor.length > 0 && <MetaRow items={instructor} />}
                </div>

                <div className="vz-case-head__side">
                    <div className="vz-case-head__state">
                        <div className="vz-case-head__state-label">Estado procesal actual</div>
                        <div className="vz-case-head__state-value">{caseStateLabel(c.currentState)}</div>
                    </div>
                    {actions}
                </div>
            </div>

            {children}
        </section>
    )
}

/** Un renglón de datos separados por barras, como en el prototipo. */
function MetaRow({ items }: { items: ReactNode[] }) {
    return (
        <div className="vz-case-head__meta">
            {items.map((item, i) => (
                <Fragment key={i}>
                    {i > 0 && <span className="vz-case-head__sep" aria-hidden="true">|</span>}
                    <span>{item}</span>
                </Fragment>
            ))}
        </div>
    )
}
