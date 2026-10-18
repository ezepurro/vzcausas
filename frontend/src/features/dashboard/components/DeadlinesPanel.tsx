import type { ReactNode } from 'react'
import { Button, Panel, Pill } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { formatPersonName } from '@/shared/lib/personName'
import { sacLabel } from '@/features/cases'
import type { DashboardDeadline } from '@/features/dashboard/types/dashboard'
import {
    URGENCY_TONES,
    groupByUrgency,
    shortDueText,
    urgencyOf,
    type Urgency,
} from '@/features/dashboard/utils/urgency'


/** El filtro por urgencia: uno de los cuatro grupos, o todos. */
export type UrgencyFilter = Urgency | 'all'

interface DeadlinesPanelProps {
    title: string
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
 */
export function DeadlinesPanel({
    title,
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
                <ul className="vz-dash-deadlines">
                    {visible.map((deadline) => (
                        <li key={deadline.caseId}>
                            <button type="button" className="vz-dash-deadline" onClick={() => onOpen(deadline.caseId)}>
                                <span className="vz-dash-deadline__date">{formatDate(deadline.dueDate)}</span>
                                <span className="vz-dash-deadline__body">
                                    <span className="vz-dash-deadline__caption">{deadline.caption}</span>
                                    <span className="vz-dash-deadline__meta">
                                        {deadline.currentStateName} · {sacLabel(deadline.sacNumber)}
                                        {showLawyer && ` · ${formatPersonName(deadline.responsibleLawyer)}`}
                                    </span>
                                </span>
                                <Pill tone={URGENCY_TONES[urgencyOf(deadline.businessDaysRemaining)]} dot>
                                    {shortDueText(deadline.businessDaysRemaining)}
                                </Pill>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    )
}