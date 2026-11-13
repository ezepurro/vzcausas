import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { Button, Icon, IconButton, Panel } from '@/shared/components/ui'
import { parseDateOnly } from '@/shared/lib/dates'
import type { DashboardDeadline } from '@/features/dashboard/types/dashboard'
import { dayTitle, monthTitle } from '@/features/dashboard/utils/dashboardDate'
import { shortDueText, urgencyOf } from '@/features/dashboard/utils/urgency'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Cuántos plazos entran en un día antes del "+N más". */
const MAX_PER_DAY = 2

/** Cuántos puntos muestra el día en el teléfono. */
const MAX_DOTS = 3

const countLabel = (n: number) => `${n} ${n === 1 ? 'plazo' : 'plazos'}`

interface DeadlineCalendarProps {
    /** La fecha del tablero (`date`, el día en Córdoba): el mes que se abre y el día marcado. */
    today: string
    deadlines: DashboardDeadline[]
    onOpen: (caseId: number) => void
}

/** `Date` local → `YYYY-MM-DD`, para comparar con `dueDate` sin pasar por UTC. */
function toIsoDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "GÓMEZ, Ariel Fernando p.s.a. Robo calificado" → "GÓMEZ, Ariel Fernando", como el prototipo. */
function shortCaption(caption: string): string {
    return caption.split(/ p\.s\.a\.| c\/| —/)[0]
}

/**
 * "Agenda de plazos" (CA-41.12): el mes con cada plazo en el día en que
 * vence. Sólo sábados y domingos son no hábiles (D-73), así que son los
 * únicos días sombreados.
 *
 * **La lista del día** (H-50 de `docs/auditoria-front`). Un día puede abrir,
 * debajo de la grilla, la lista de todos sus plazos, cada uno un enlace a su
 * causa. Se abre de dos maneras, y el CSS muestra una u otra según el ancho:
 *
 * - En el teléfono, el día entero es un botón (`__open`): ahí no entra la
 *   carátula, y los puntos sueltos medían 18×20 px.
 * - En pantallas anchas la carátula sigue en la celda y lleva a la causa; el
 *   "+N más", que antes no se podía tocar, abre la lista.
 *
 * Al abrirse, el foco va al título de la lista; Escape la cierra y lo devuelve
 * al botón que la abrió.
 */
export function DeadlineCalendar({ today, deadlines, onOpen }: DeadlineCalendarProps) {
    const todayDate = parseDateOnly(today) ?? new Date()
    const [month, setMonth] = useState({ year: todayDate.getFullYear(), month: todayDate.getMonth() })
    /** El día (`YYYY-MM-DD`) cuya lista está abierta, o `null`. */
    const [openDay, setOpenDay] = useState<string | null>(null)
    const listId = useId()
    const titleRef = useRef<HTMLHeadingElement>(null)
    /** El botón que abrió la lista: ahí vuelve el foco al cerrarla. */
    const openerRef = useRef<HTMLButtonElement | null>(null)

    const showMonth = (year: number, monthIndex: number) => {
        setMonth({ year, month: monthIndex })
        setOpenDay(null)
    }
    const move = (delta: number) => {
        const first = new Date(month.year, month.month + delta, 1)
        showMonth(first.getFullYear(), first.getMonth())
    }

    // La grilla arranca el lunes de la semana del día 1 y termina el domingo de la última.
    const offset = (new Date(month.year, month.month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(month.year, month.month + 1, 0).getDate()
    const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
        const date = new Date(month.year, month.month, 1 - offset + i)
        const iso = toIsoDate(date)
        return {
            iso,
            day: date.getDate(),
            outside: date.getMonth() !== month.month,
            weekend: date.getDay() === 0 || date.getDay() === 6,
            isToday: iso === today,
            items: deadlines.filter((d) => d.dueDate === iso),
        }
    })
    const openItems = openDay === null ? [] : deadlines.filter((d) => d.dueDate === openDay)

    // Recién abierta, el foco va a su título: está lejos del día que la abrió.
    useEffect(() => {
        if (openDay !== null) titleRef.current?.focus()
    }, [openDay])

    function toggleDay(iso: string, opener: HTMLButtonElement) {
        openerRef.current = opener
        setOpenDay((current) => (current === iso ? null : iso))
    }

    function closeDay() {
        setOpenDay(null)
        openerRef.current?.focus()
    }

    // Escape, desde la grilla o desde la lista.
    function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== 'Escape' || openDay === null) return
        event.stopPropagation()
        closeDay()
    }

    return (
        <Panel
            title={monthTitle(month.year, month.month)}
            sub="Tus plazos según la fecha en que vencen. Los fines de semana aparecen sombreados."
            actions={
                <>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => showMonth(todayDate.getFullYear(), todayDate.getMonth())}
                    >
                        Hoy
                    </Button>
                    <IconButton name="back" label="Mes anterior" onClick={() => move(-1)} />
                    <IconButton name="forward" label="Mes siguiente" onClick={() => move(1)} />
                </>
            }
        >
            <div onKeyDown={onKeyDown}>
                <div className="vz-dash-cal__weekdays">
                    {WEEKDAYS.map((weekday) => (
                        <div key={weekday} className="vz-dash-cal__weekday">{weekday}</div>
                    ))}
                </div>
                <div className="vz-dash-cal__grid">
                    {cells.map((cell) => {
                        const expanded = openDay === cell.iso
                        const extra = cell.items.length - MAX_PER_DAY
                        return (
                            <div
                                key={cell.iso}
                                className={[
                                    'vz-dash-cal__day',
                                    cell.weekend && 'vz-dash-cal__day--weekend',
                                    cell.outside && 'vz-dash-cal__day--outside',
                                    cell.isToday && 'vz-dash-cal__day--today',
                                    expanded && 'vz-dash-cal__day--open',
                                ].filter(Boolean).join(' ')}
                            >
                                <span className="vz-dash-cal__num">{cell.day}</span>
                                {cell.items.length > 0 && (
                                    <>
                                        {/* El día entero, en el teléfono. */}
                                        <button
                                            type="button"
                                            className="vz-dash-cal__open"
                                            aria-label={`${dayTitle(cell.iso)}, ${countLabel(cell.items.length)}`}
                                            aria-expanded={expanded}
                                            aria-controls={expanded ? listId : undefined}
                                            onClick={(event) => toggleDay(cell.iso, event.currentTarget)}
                                        >
                                            {cell.items.slice(0, MAX_DOTS).map((deadline) => (
                                                <span
                                                    key={deadline.caseId}
                                                    className={`vz-dash-cal__dot vz-dash-cal__dot--${urgencyOf(deadline.businessDaysRemaining)}`}
                                                />
                                            ))}
                                        </button>
                                        <div className="vz-dash-cal__items">
                                            {cell.items.slice(0, MAX_PER_DAY).map((deadline) => (
                                                <button
                                                    key={deadline.caseId}
                                                    type="button"
                                                    className="vz-dash-cal__item"
                                                    title={`${deadline.caption} · ${deadline.currentStateName}`}
                                                    onClick={() => onOpen(deadline.caseId)}
                                                >
                                                    <span
                                                        className={`vz-dash-cal__dot vz-dash-cal__dot--${urgencyOf(deadline.businessDaysRemaining)}`}
                                                    />
                                                    <span>{shortCaption(deadline.caption)}</span>
                                                </button>
                                            ))}
                                            {extra > 0 && (
                                                <button
                                                    type="button"
                                                    className="vz-dash-cal__more"
                                                    aria-label={`+${extra} más: ver los ${countLabel(cell.items.length)} del ${dayTitle(cell.iso).toLowerCase()}`}
                                                    aria-expanded={expanded}
                                                    aria-controls={expanded ? listId : undefined}
                                                    onClick={(event) => toggleDay(cell.iso, event.currentTarget)}
                                                >
                                                    +{extra} más
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
                {openDay !== null && (
                    <section className="vz-dash-cal__list" id={listId} aria-labelledby={`${listId}-title`}>
                        <div className="vz-dash-cal__list-head">
                            <h3 className="vz-dash-cal__list-title" id={`${listId}-title`} tabIndex={-1} ref={titleRef}>
                                {dayTitle(openDay)} · {countLabel(openItems.length)}
                            </h3>
                            <Button size="sm" variant="ghost" onClick={closeDay}>Cerrar</Button>
                        </div>
                        <ul className="vz-dash-cal__list-items">
                            {openItems.map((deadline) => (
                                <li key={deadline.caseId}>
                                    <Link className="vz-dash-cal__list-link" to={`/causas/${deadline.caseId}`}>
                                        <span
                                            className={`vz-dash-cal__dot vz-dash-cal__dot--${urgencyOf(deadline.businessDaysRemaining)}`}
                                            aria-hidden="true"
                                        />
                                        <span className="vz-dash-cal__list-main">
                                            <span className="vz-dash-cal__list-caption">{deadline.caption}</span>
                                            <span className="vz-dash-cal__list-meta">
                                                {deadline.currentStateName} · {shortDueText(deadline.businessDaysRemaining)}
                                            </span>
                                        </span>
                                        <Icon name="forward" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </Panel>
    )
}
