import { Fragment, type ReactNode } from 'react'
import { Avatar, Button, Icon, Panel, Pill } from '@/shared/components/ui'
import { formatPersonFullName, formatPersonName } from '@/shared/lib/personName'
import { sacLabel } from '@/features/cases'
import type { DashboardDeadline } from '@/features/dashboard/types/dashboard'
import {
    URGENCY_TONES,
    groupByUrgency,
    shortDueText,
    urgencyOf,
    type Urgency,
} from '@/features/dashboard/utils/urgency'
import { dayParts, shortDayLabel } from '@/features/dashboard/utils/dashboardDate'


/** El filtro por urgencia: uno de los cuatro grupos, o todos. */
export type UrgencyFilter = Urgency | 'all'

interface DeadlinesPanelProps {
    title: string
    /** Fecha del tablero (`YYYY-MM-DD`), para la marca de hoy en la línea. */
    today: string
    /** Los plazos a mostrar, en el orden del backend (por urgencia). */
    deadlines: DashboardDeadline[]
    urgency: UrgencyFilter
    onUrgencyChange: (urgency: UrgencyFilter) => void
    onOpen: (caseId: number) => void
    /** En "Estudio" cada plazo dice quién es el responsable; en "Mi día" no hace falta. */
    showLawyer?: boolean
    /** Algo más en la cabecera, como el chip del abogado elegido en "Estudio". */
    extraActions?: ReactNode
}
/**
 * Los plazos abiertos agrupados por urgencia (CA-41.3, CA-41.12, CA-42.4,
 * CA-42.10). Los botones dicen cuántos hay en cada grupo y filtran la lista.
 * El filtro lo guarda la página: el componente sólo avisa.
 *
 * La lista es la línea de vencimientos del prototipo: una línea vertical con
 * un nodo por plazo, la fecha a la izquierda (una sola vez por día) y, viendo
 * todos, la marca de hoy entre lo vencido y lo que viene.
 */
export function DeadlinesPanel({
    title,
    today,
    deadlines,
    urgency,
    onUrgencyChange,
    onOpen,
    showLawyer = false,
    extraActions,
}: DeadlinesPanelProps) {
    const groups = groupByUrgency(deadlines)
    const visible =
        urgency === 'all' ? deadlines : (groups.find((g) => g.urgency === urgency)?.items ?? [])
    // Viendo todos, la marca de hoy va antes del primer plazo que no venció, o al final.
    const todayIndex =
        urgency === 'all' ? visible.findIndex((d) => d.businessDaysRemaining >= 0) : null

    return (
        <Panel
            title={title}
            actions={
                <>
                    {extraActions}
                    <div role="group" aria-label="Filtrar por urgencia" className="vz-filters">
                        <Button size="sm" variant="secondary" pressed={urgency === 'all'} onClick={() => onUrgencyChange('all')}>
                            Todos<span className="vz-dash-count">{deadlines.length}</span>
                        </Button>
                        {groups.map((group) => (
                            <Button
                                key={group.urgency}
                                size="sm"
                                variant="secondary"
                                pressed={urgency === group.urgency}
                                onClick={() => onUrgencyChange(group.urgency)}
                            >
                                {group.label}<span className="vz-dash-count">{group.items.length}</span>
                            </Button>
                        ))}
                    </div>
                </>
            }
        >
            {visible.length === 0 ? (
                <div className="vz-empty">
                    <div className="vz-empty__text">No hay plazos en esta selección.</div>
                </div>
            ) : (
                <ul className="vz-dash-line">
                    {visible.map((deadline, i) => {
                        const level = urgencyOf(deadline.businessDaysRemaining)
                        const sameDay = i > 0 && i !== todayIndex && visible[i - 1].dueDate === deadline.dueDate
                        const parts = dayParts(deadline.dueDate)
                        return (
                            <Fragment key={deadline.caseId}>
                                {i === todayIndex && <TodayMark today={today} />}
                                <li className={`vz-dash-line__item vz-dash-line__item--${level}`}>
                                    <span
                                        className={`vz-dash-line__date${sameDay ? ' vz-dash-line__date--repeat' : ''}`}
                                    >
                                        <span className="vz-dash-line__weekday">{parts?.weekday}</span>
                                        <span className="vz-dash-line__day">
                                            {parts?.day ?? '—'}
                                            <span className="vz-dash-line__month"> {parts?.month}</span>
                                        </span>
                                    </span>
                                    <span className="vz-dash-line__rail" aria-hidden="true">
                                        <span className="vz-dash-line__node" />
                                    </span>
                                    <button type="button" className="vz-dash-line__card" onClick={() => onOpen(deadline.caseId)}>
                                        <span className="vz-dash-line__head">
                                            <span className="vz-dash-line__body">
                                                <span className="vz-dash-line__caption">{deadline.caption}</span>
                                                <span className="vz-dash-line__meta">
                                                    {deadline.currentStateName} ·{' '}
                                                    <span className="vz-mono">{sacLabel(deadline.sacNumber)}</span>
                                                </span>
                                            </span>
                                            <Pill tone={URGENCY_TONES[level]}>
                                                {shortDueText(deadline.businessDaysRemaining)}
                                            </Pill>
                                        </span>
                                        <span className="vz-dash-line__foot">
                                            {showLawyer ? (
                                                <span className="vz-dash-line__lawyer">
                                                    <Avatar name={formatPersonFullName(deadline.responsibleLawyer)} />
                                                    <span className="vz-dash-line__lawyer-name">
                                                        {formatPersonName(deadline.responsibleLawyer)}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span />
                                            )}
                                            <span className="vz-dash-line__open">
                                                Ver causa
                                                <Icon name="forward" size={13} />
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            </Fragment>
                        )
                    })}
                    {todayIndex === -1 && <TodayMark today={today} />}
                </ul>
            )}
        </Panel>
    )
}

/**
 * La marca de hoy en la línea. Es decorativa: cada plazo ya dice en su chip
 * si venció o cuánto le falta.
 */
function TodayMark({ today }: { today: string }) {
    return (
        <li className="vz-dash-line__today" aria-hidden="true">
            <span className="vz-dash-line__today-label">Hoy</span>
            <span className="vz-dash-line__rail">
                <span className="vz-dash-line__today-node" />
            </span>
            <span className="vz-dash-line__today-rule">
                <span className="vz-dash-line__today-bar" />
                <span className="vz-dash-line__today-date">{shortDayLabel(today)}</span>
            </span>
        </li>
    )
}
