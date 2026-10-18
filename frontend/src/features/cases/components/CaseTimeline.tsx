import type { ReactNode } from 'react'
import { Button, Panel, Pill } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { formatPersonFullName } from '@/shared/lib/personName'
import type {
    TimelineEntry,
    TimelineInterruptiveActEntry,
    TimelinePrescriptionEntry,
    TimelineProceduralActEntry,
} from '@/features/cases/types/timeline'
import { actDeadlineBadge } from '@/features/cases/utils/timeline'

export interface CaseTimelineProps {
    /** Las entradas tal como las manda el backend, de la más reciente a la más antigua. */
    entries: TimelineEntry[] | undefined
    loading: boolean
    /** El mensaje del servidor si no cargó; se muestra dentro del panel. */
    error: string | null
    /** Sólo el abogado responsable registra el primer acto (D-30). */
    canRegisterAct: boolean
    onRegisterAct: () => void
}

/**
 * "Ciclo de vida de la causa" (HU27): todo lo que le pasó a la causa, en un
 * solo listado (`GET /cases/{caseId}/timeline`, V4 D-85). Cada movimiento es
 * un elemento de la lista; el orden lo fija el backend.
 *
 * "Modificar" y "Anular" de cada acto, que muestra el prototipo, son HU28 y
 * HU29 (V4 §8.3): no se dibujan.
 */
export function CaseTimeline({ entries, loading, error, canRegisterAct, onRegisterAct }: CaseTimelineProps) {
    let body: ReactNode
    if (loading) {
        body = <div className="vz-empty"><div className="vz-empty__title">Cargando el ciclo de vida…</div></div>
    } else if (error !== null) {
        body = (
            <div className="vz-empty">
                <div className="vz-empty__title">No se pudo cargar el ciclo de vida</div>
                <div className="vz-empty__text">{error}</div>
            </div>
        )
    } else if (!entries || entries.length === 0) {
        // La causa está en "Iniciada": no es un error (CA-27.14).
        body = (
            <div className="vz-timeline__empty">
                <div className="vz-timeline__empty-title">Todavía no hay actos procesales</div>
                <p className="vz-timeline__empty-text">
                    El ciclo de vida empieza con el primer acto procesal: ese acto fija el estado de la causa.
                </p>
                <Button size="md" disabled={!canRegisterAct} onClick={onRegisterAct}>
                    Registrar el primer acto
                </Button>
            </div>
        )
    } else {
        body = (
            <ol className="vz-timeline">
                {entries.map((entry) => <TimelineItem key={entryKey(entry)} entry={entry} />)}
            </ol>
        )
    }

    return (
        <Panel
            title="Ciclo de vida de la causa"
            sub="Estados por los que pasó la causa, con el acto procesal que produjo cada cambio."
            footer="Cada acto procesal registrado deja asentado el estado procesal resultante y, cuando corresponde, el plazo que abre. Los actos interruptivos reinician el cómputo de la prescripción."
        >
            <div className="vz-panel__body">{body}</div>
        </Panel>
    )
}

function entryKey(entry: TimelineEntry): string {
    switch (entry.type) {
        case 'PROCEDURAL_ACT': return `act-${entry.proceduralAct.id}`
        case 'INTERRUPTIVE_ACT': return `interruptive-${entry.interruptiveAct.id}`
        case 'PRESCRIPTION_DECLARATION': return 'prescription'
    }
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
    switch (entry.type) {
        case 'PROCEDURAL_ACT': return <ProceduralActItem entry={entry} />
        case 'INTERRUPTIVE_ACT': return <InterruptiveActItem entry={entry} />
        case 'PRESCRIPTION_DECLARATION': return <PrescriptionItem entry={entry} />
    }
}

/**
 * Un acto procesal: el estado al que llevó la causa. El nombre del acto es el
 * del estado (D-76), así que no hay un renglón "Por el acto". Sólo el acto
 * vigente muestra su plazo: los de los demás están cerrados.
 */
function ProceduralActItem({ entry }: { entry: TimelineProceduralActEntry }) {
    const act = entry.proceduralAct
    const deadline = entry.current ? act.deadline : null
    const badge = deadline ? actDeadlineBadge(deadline.dueDate) : null
    const modifier = badge ? (badge.urgent ? 'overdue' : 'open') : null

    return (
        <Item title={act.resultingState.name} date={act.actDate} modifier={modifier}>
            {(act.resultingState.custom || act.notificationDate) && (
                <div className="vz-timeline__sub">
                    {act.resultingState.custom && 'Estado escrito a mano.'}
                    {act.resultingState.custom && act.notificationDate && ' '}
                    {act.notificationDate && `Notificado el ${formatDate(act.notificationDate)}.`}
                </div>
            )}
            {badge && deadline && (
                <div className="vz-timeline__tags">
                    <Pill tone={badge.tone}>{badge.label}</Pill>
                    {deadline.manuallyAdjusted && (
                        <span className="vz-timeline__tag-note">Vencimiento ajustado a mano</span>
                    )}
                </div>
            )}
            <Notes text={act.notes} />
            <RegisteredBy person={act.registeredBy} />
        </Item>
    )
}

/** Un acto interruptivo: no mueve el estado, reinicia la prescripción (D-48). */
function InterruptiveActItem({ entry }: { entry: TimelineInterruptiveActEntry }) {
    const act = entry.interruptiveAct
    return (
        <Item title={act.name} date={act.actDate} modifier="interruptive">
            <div className="vz-timeline__sub">No modifica el estado procesal.</div>
            <div className="vz-timeline__tags">
                <Pill tone="warn">Acto interruptivo</Pill>
                {entry.governsPrescription && (
                    <span className="vz-timeline__tag-note">Rige el cómputo de la prescripción</span>
                )}
            </div>
            <Notes text={act.notes} />
            <RegisteredBy person={act.registeredBy} />
        </Item>
    )
}

/** El pase a "Prescripta" (HU33): con la resolución que la declara. */
function PrescriptionItem({ entry }: { entry: TimelinePrescriptionEntry }) {
    const d = entry.prescriptionDeclaration
    return (
        <Item title="Prescripta" date={d.prescriptionDate} modifier="prescribed">
            <div className="vz-timeline__sub">Resolución: {d.resolution}</div>
            <div className="vz-timeline__tags">
                <Pill tone="danger">Causa prescripta</Pill>
            </div>
            <Notes text={d.grounds} />
            <RegisteredBy person={d.registeredBy} />
        </Item>
    )
}

function Item({ title, date, modifier, children }: {
    title: string
    date: string
    modifier: 'open' | 'overdue' | 'interruptive' | 'prescribed' | null
    children: ReactNode
}) {
    return (
        <li className={`vz-timeline__item${modifier ? ` vz-timeline__item--${modifier}` : ''}`}>
            <div className="vz-timeline__head">
                <div className="vz-timeline__title">{title}</div>
                <div className="vz-timeline__date">{formatDate(date)}</div>
            </div>
            {children}
        </li>
    )
}

function Notes({ text }: { text: string | null }) {
    return text ? <div className="vz-timeline__notes">{text}</div> : null
}

function RegisteredBy({ person }: { person: { lastName: string; firstName: string } }) {
    return <div className="vz-timeline__by">Registrado por {formatPersonFullName(person)}</div>
}
