import { useState } from 'react'
import { Button, IconButton, Panel } from '@/shared/components/ui'
import { parseDateOnly } from '@/shared/lib/dates'
import type { DashboardDeadline } from '@/features/dashboard/types/dashboard'
import { monthTitle } from '@/features/dashboard/utils/dashboardDate'
import { urgencyOf } from '@/features/dashboard/utils/urgency'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Cuántos plazos entran en un día antes del "+N más". */
const MAX_PER_DAY = 2

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
 */
export function DeadlineCalendar({ today, deadlines, onOpen }: DeadlineCalendarProps) {
    const todayDate = parseDateOnly(today) ?? new Date()
    const [month, setMonth] = useState({ year: todayDate.getFullYear(), month: todayDate.getMonth() })

    const move = (delta: number) => {
        const first = new Date(month.year, month.month + delta, 1)
        setMonth({ year: first.getFullYear(), month: first.getMonth() })
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

    return (
        <Panel
            title={monthTitle(month.year, month.month)}
            sub="Tus plazos según la fecha en que vencen. Los fines de semana aparecen sombreados."
            actions={
                <>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setMonth({ year: todayDate.getFullYear(), month: todayDate.getMonth() })}
                    >
                        Hoy
                    </Button>
                    <IconButton name="back" label="Mes anterior" onClick={() => move(-1)} />
                    <IconButton name="forward" label="Mes siguiente" onClick={() => move(1)} />
                </>
            }
        >
            <div className="vz-dash-cal__weekdays">
                {WEEKDAYS.map((weekday) => (
                    <div key={weekday} className="vz-dash-cal__weekday">{weekday}</div>
                ))}
            </div>
            <div className="vz-dash-cal__grid">
                {cells.map((cell) => (
                    <div
                        key={cell.iso}
                        className={[
                            'vz-dash-cal__day',
                            cell.weekend && 'vz-dash-cal__day--weekend',
                            cell.outside && 'vz-dash-cal__day--outside',
                            cell.isToday && 'vz-dash-cal__day--today',
                        ].filter(Boolean).join(' ')}
                    >
                        <span className="vz-dash-cal__num">{cell.day}</span>
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
                            {cell.items.length > MAX_PER_DAY && (
                                <span className="vz-dash-cal__more">+{cell.items.length - MAX_PER_DAY} más</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Panel>
    )
}