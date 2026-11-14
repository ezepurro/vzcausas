import { useId, type ReactNode } from 'react'
import { Button, LoadError, LoadingState, Panel, Pill } from '@/shared/components/ui'
import { TimelineSkeleton } from '@/features/cases/components/CaseSkeletons'
import { formatDate, formatDateTime } from '@/shared/lib/dates'
import { formatPersonFullName } from '@/shared/lib/personName'
import type { ProceduralAct } from '@/features/cases/types/proceduralAct'
import type {
    TimelineEntry,
    TimelineInterruptiveActEntry,
    TimelinePrescriptionEntry,
    TimelineQualificationPrescriptionEntry,
    TimelineProceduralActEntry,
} from '@/features/cases/types/timeline'
import { actDeadlineBadge, actTermDays, actTermText, closedDeadlineText } from '@/features/cases/utils/timeline'

export interface CaseTimelineProps {
    /** Las entradas tal como las manda el backend, de la más reciente a la más antigua. */
    entries: TimelineEntry[] | undefined
    loading: boolean
    /** El error de la consulta si no cargó (`null` si cargó); se muestra dentro del panel. */
    error: unknown
    /** Vuelve a pedir la línea de vida. */
    onRetry: () => void
    /** Se está volviendo a pedir. */
    retrying: boolean
    /** Sólo el abogado responsable registra el primer acto (D-30). */
    canRegisterAct: boolean
    /** El id de la nota que explica por qué "Registrar el primer acto" está deshabilitado. */
    registerNoteId?: string
    onRegisterAct: () => void
    /**
     * Si los actos procesales ofrecen "Modificar" (HU28) y "Anular" (HU29).
     * En una causa prescripta no se ofrecen: sus actos no se modifican ni se
     * anulan (D-99, D-124).
     */
    canModifyActs: boolean
    /** "Modificar" en un acto. */
    onModifyAct: (act: ProceduralAct) => void
    /** "Anular" en un acto (HU29). */
    onAnnulAct: (act: ProceduralAct) => void
    /**
     * Por qué no se pueden modificar ni anular los actos, o `null` si se
     * puede. Con texto, cada "Modificar" y cada "Anular" van deshabilitados y
     * la nota se muestra arriba de la lista, unida a ellos: sólo el
     * responsable los opera (D-30). Antes el botón estaba para todos y avisaba
     * al tocarlo; ahora sigue el criterio de "Registrar acto procesal" (tanda
     * 15 de `docs/auditoria-front`).
     */
    modifyBlockedNote?: string | null
}

/**
 * "Ciclo de vida de la causa" (HU27): todo lo que le pasó a la causa, en un
 * solo listado (`GET /cases/{caseId}/timeline`, V4 D-85). Cada movimiento es
 * un elemento de la lista; el orden lo fija el backend.
 *
 * Cada acto procesal lleva "Modificar" (HU28) y "Anular" (HU29). Un acto
 * anulado no vuelve en la respuesta: desaparece de la lista (D-124), no queda
 * "asentado como anulado" como dice el prototipo.
 */
export function CaseTimeline({
    entries, loading, error, onRetry, retrying, canRegisterAct, registerNoteId, onRegisterAct, canModifyActs, onModifyAct,
    onAnnulAct, modifyBlockedNote = null,
}: CaseTimelineProps) {
    const modifyNoteId = useId()
    const blocked = canModifyActs && modifyBlockedNote !== null
    let body: ReactNode
    if (loading) {
        body = (
            <LoadingState label="Cargando el ciclo de vida…">
                <TimelineSkeleton />
            </LoadingState>
        )
    } else if (error != null) {
        body = <LoadError title="No se pudo cargar el ciclo de vida" error={error} onRetry={onRetry} retrying={retrying} />
    } else if (!entries || entries.length === 0) {
        // La causa está en "Iniciada": no es un error (CA-27.14).
        body = (
            <div className="vz-timeline__empty">
                <div className="vz-timeline__empty-title">Todavía no hay actos procesales</div>
                <p className="vz-timeline__empty-text">
                    El ciclo de vida empieza con el primer acto procesal: ese acto fija el estado de la causa.
                </p>
                <Button
                    size="md"
                    disabled={!canRegisterAct}
                    aria-describedby={canRegisterAct ? undefined : registerNoteId}
                    onClick={onRegisterAct}
                >
                    Registrar el primer acto
                </Button>
            </div>
        )
    } else {
        body = (
            <>
                {blocked && <p className="vz-note vz-timeline__note" id={modifyNoteId}>{modifyBlockedNote}</p>}
                <ol className="vz-timeline">
                    {entries.map((entry) => (
                        <TimelineItem
                            key={entryKey(entry)}
                            entry={entry}
                            actActions={canModifyActs ? { onModify: onModifyAct, onAnnul: onAnnulAct } : undefined}
                            modifyNoteId={blocked ? modifyNoteId : undefined}
                        />
                    ))}
                </ol>
            </>
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
        case 'QUALIFICATION_PRESCRIPTION_DECLARATION': return `qualification-prescription-${entry.legalQualification.id}`
        case 'PRESCRIPTION_DECLARATION': return 'prescription'
    }
}

/** "Modificar" y "Anular" de un acto procesal. */
type ActActions = {
    onModify: (act: ProceduralAct) => void
    onAnnul: (act: ProceduralAct) => void
}

function TimelineItem({ entry, actActions, modifyNoteId }: {
    entry: TimelineEntry
    /** Sin acciones (causa prescripta), el acto no ofrece ninguna. */
    actActions: ActActions | undefined
    /** Con id, "Modificar" y "Anular" van deshabilitados y lo explica esa nota. */
    modifyNoteId: string | undefined
}) {
    switch (entry.type) {
        case 'PROCEDURAL_ACT': return <ProceduralActItem entry={entry} actions={actActions} blockedNoteId={modifyNoteId} />
        case 'INTERRUPTIVE_ACT': return <InterruptiveActItem entry={entry} />
        case 'QUALIFICATION_PRESCRIPTION_DECLARATION': return <QualificationPrescriptionItem entry={entry} />
        case 'PRESCRIPTION_DECLARATION': return <PrescriptionItem entry={entry} />
    }
}

/**
 * Un acto procesal: el estado al que llevó la causa. El nombre del acto es el
 * del estado (D-76), así que no hay un renglón "Por el acto".
 *
 * Todo acto que abrió plazo lo muestra, con el que se registró (CA-27.3,
 * CA-27.7). Sólo el del acto vigente está abierto, con el chip; los de los
 * demás se muestran cerrados (CA-27.4). Si el vencimiento se ajustó a mano,
 * se marca como tal y el plazo es el que da esa fecha, no el de la tabla
 * (CA-27.6, V4 D-86).
 *
 * Si se modificó, el pie lo dice con quién y cuándo (CA-28.10). Al pie,
 * "Modificar" (HU28) y "Anular" (HU29), como en el prototipo.
 */
function ProceduralActItem({ entry, actions, blockedNoteId }: {
    entry: TimelineProceduralActEntry
    actions: ActActions | undefined
    blockedNoteId: string | undefined
}) {
    const act = entry.proceduralAct
    const deadline = act.deadline
    const badge = deadline && entry.current ? actDeadlineBadge(deadline.dueDate) : null
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
            {deadline && (
                <div className="vz-timeline__tags">
                    {actTermDays(deadline) > 0 && (
                        <span className="vz-timeline__term">{actTermText(deadline)}</span>
                    )}
                    {badge ? (
                        <Pill tone={badge.tone}>{badge.label}</Pill>
                    ) : (
                        <span className="vz-timeline__term">{closedDeadlineText(deadline.dueDate)}</span>
                    )}
                    {deadline.manuallyAdjusted && (
                        <span className="vz-timeline__tag-note">Vencimiento ajustado a mano</span>
                    )}
                </div>
            )}
            <Notes text={act.notes} />
            <RegisteredBy
                person={act.registeredBy}
                at={act.registeredAt}
                modifiedBy={act.lastModifiedBy}
                modifiedAt={act.lastModifiedAt}
            />
            {actions && (
                <div className="vz-timeline__actions">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={blockedNoteId !== undefined}
                        aria-describedby={blockedNoteId}
                        onClick={() => actions.onModify(act)}
                    >
                        Modificar
                    </Button>
                    <Button
                        variant="ghost-danger"
                        size="sm"
                        disabled={blockedNoteId !== undefined}
                        aria-describedby={blockedNoteId}
                        onClick={() => actions.onAnnul(act)}
                    >
                        Anular
                    </Button>
                </div>
            )}
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
            <RegisteredBy person={act.registeredBy} at={act.registeredAt} />
        </Item>
    )
}

/** El pase a "Prescripta" (HU33): con la resolución que la declara. */
/**
 * D-113: una calificación declarada prescripta. No cierra la causa por sí sola:
 * eso lo dice, cuando pasa, la entrada "Prescripta" de la causa.
 */
function QualificationPrescriptionItem({ entry }: { entry: TimelineQualificationPrescriptionEntry }) {
    const d = entry.prescriptionDeclaration
    return (
        <Item title="Calificación declarada prescripta" date={d.prescriptionDate} modifier="prescribed">
            <div className="vz-timeline__sub">{entry.legalQualification.name}</div>
            <div className="vz-timeline__sub">Resolución: {d.resolution}</div>
            <Notes text={d.grounds} />
            <RegisteredBy person={d.registeredBy} at={d.registeredAt} />
        </Item>
    )
}

function PrescriptionItem({ entry }: { entry: TimelinePrescriptionEntry }) {
    const d = entry.prescriptionDeclaration
    return (
        <Item title="Prescripta" date={d.prescriptionDate} modifier="prescribed">
            <div className="vz-timeline__sub">Resolución: {d.resolution}</div>
            <div className="vz-timeline__tags">
                <Pill tone="danger">Causa prescripta</Pill>
            </div>
            <Notes text={d.grounds} />
            <RegisteredBy person={d.registeredBy} at={d.registeredAt} />
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

type PersonRef = { lastName: string; firstName: string }

/**
 * Quién lo registró y cuándo: "Registrado por Malena Ríos el 09/09/2026 a las
 * 11:42". Si se modificó, suma " · Modificado por … el … a las …" (prototipo).
 */
function RegisteredBy({ person, at, modifiedBy = null, modifiedAt = null }: {
    person: PersonRef
    at: string
    modifiedBy?: PersonRef | null
    modifiedAt?: string | null
}) {
    return (
        <div className="vz-timeline__by">
            Registrado por {formatPersonFullName(person)} el {formatDateTime(at)}
            {modifiedBy && modifiedAt && (
                <> · Modificado por {formatPersonFullName(modifiedBy)} el {formatDateTime(modifiedAt)}</>
            )}
        </div>
    )
}
