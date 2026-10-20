import { useState } from 'react'
import type { LawyerDashboard } from '@/features/dashboard/types/dashboard'
import { SummaryBand, type SummaryTile } from '@/features/dashboard/components/SummaryBand'
import { FirstDeadline } from '@/features/dashboard/components/FirstDeadline'
import { DeadlinesPanel, type UrgencyFilter } from '@/features/dashboard/components/DeadlinesPanel'
import { DeadlineCalendar } from '@/features/dashboard/components/DeadlineCalendar'
import { PrescriptionAlertsPanel } from '@/features/dashboard/components/PrescriptionAlertsPanel'
import { CasesToAdvancePanel } from '@/features/dashboard/components/CasesToAdvancePanel'

interface LawyerDashboardViewProps {
    dashboard: LawyerDashboard
    onOpen: (caseId: number) => void
}

/**
 * "Mi día" (HU-41): el tablero del abogado, con sus causas. Recibe el
 * tablero ya cargado; lo pide `HomePage`.
 */
export function LawyerDashboardView({ dashboard, onOpen }: LawyerDashboardViewProps) {
    const [urgency, setUrgency] = useState<UrgencyFilter>('all')
    const { summary } = dashboard

    // CA-41.2, con los rótulos y las notas del prototipo, en su orden.
    const tiles: SummaryTile[] = [
        { label: 'Vencen hoy', value: summary.dueToday, note: 'Último día para presentar', tone: 'danger' },
        { label: 'Vencidos', value: summary.overdue, note: 'Requieren regularización', tone: 'danger' },
        { label: 'Próx. 5 días hábiles', value: summary.dueSoon, note: 'Plazos en curso', tone: 'warn' },
        { label: 'Mis causas activas', value: summary.activeCases, note: 'Bajo tu responsabilidad' },
    ]

    return (
        <div className="vz-dash">
            <SummaryBand
                tiles={tiles}
                aside={<FirstDeadline deadline={dashboard.deadlines[0]} onOpen={onOpen} />}
            />
            {/* Primero la agenda, como en el prototipo, con las dos listas cortas al
                lado; la línea de plazos va en su propia fila, a todo el ancho, para
                que no deje un hueco bajo la columna angosta. */}
            <div className="vz-dash__row vz-dash__row--filled">
                <div className="vz-dash__main">
                    <DeadlineCalendar today={dashboard.date} deadlines={dashboard.deadlines} onOpen={onOpen} />
                </div>
                <div className="vz-dash__side">
                    {/* El alto de la fila lo pone la agenda: las dos listas se lo
                        reparten y, si no entran, cada una se desplaza adentro. */}
                    <div className="vz-dash__side-fill">
                        <PrescriptionAlertsPanel alerts={dashboard.prescriptionAlerts} onOpen={onOpen} />
                        <CasesToAdvancePanel cases={dashboard.casesToAdvance} onOpen={onOpen} />
                    </div>
                </div>
            </div>
            <DeadlinesPanel
                title="Mis plazos abiertos"
                today={dashboard.date}
                deadlines={dashboard.deadlines}
                urgency={urgency}
                onUrgencyChange={setUrgency}
                onOpen={onOpen}
            />
        </div>
    )
}