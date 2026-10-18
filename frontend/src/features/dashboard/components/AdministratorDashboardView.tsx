import { useState } from 'react'
import { Button, Icon } from '@/shared/components/ui'
import { formatPersonName } from '@/shared/lib/personName'
import type { AdministratorDashboard } from '@/features/dashboard/types/dashboard'
import { SummaryBand, type SummaryTile } from '@/features/dashboard/components/SummaryBand'
import { PortfolioByJurisdiction } from '@/features/dashboard/components/PortfolioByJurisdiction'
import { DeadlinesPanel, type UrgencyFilter } from '@/features/dashboard/components/DeadlinesPanel'
import { PrescriptionAlertsPanel } from '@/features/dashboard/components/PrescriptionAlertsPanel'
import { TeamLoadPanel } from '@/features/dashboard/components/TeamLoadPanel'

interface AdministratorDashboardViewProps {
    dashboard: AdministratorDashboard
    onOpen: (caseId: number) => void
}

/**
 * "Estudio" (HU-42): el panorama de toda la cartera. Recibe el tablero ya
 * cargado; lo pide `HomePage`. Los dos filtros —por abogado y por urgencia—
 * se aplican acá sobre `deadlines`, como indica el contrato (V4 §3.11).
 */
export function AdministratorDashboardView({ dashboard, onOpen }: AdministratorDashboardViewProps) {
    const [urgency, setUrgency] = useState<UrgencyFilter>('all')
    const [lawyerId, setLawyerId] = useState<number | null>(null)
    const { summary } = dashboard

    // CA-42.2: los mismos cuatro números que en "Mi día", pero de todo el estudio.
    const tiles: SummaryTile[] = [
        { label: 'Causas activas', value: summary.activeCases, note: 'Sin archivadas ni prescriptas' },
        { label: 'Vencen hoy', value: summary.dueToday, note: 'Último día para presentar', tone: 'danger' },
        { label: 'Vencidos', value: summary.overdue, note: 'Requieren regularización', tone: 'danger' },
        { label: 'Próx. 5 días hábiles', value: summary.dueSoon, note: 'Plazos en curso', tone: 'warn' },
    ]

    // CA-42.10: tocar un abogado deja sólo sus plazos; tocarlo de nuevo, los de todos.
    const selected = dashboard.team.find((member) => member.lawyer.id === lawyerId)?.lawyer
    const deadlines = selected
        ? dashboard.deadlines.filter((d) => d.responsibleLawyer.id === selected.id)
        : dashboard.deadlines
    const toggleLawyer = (id: number) => setLawyerId((current) => (current === id ? null : id))

    return (
        <div className="vz-dash">
            <SummaryBand
                tiles={tiles}
                aside={<PortfolioByJurisdiction items={dashboard.casesByJurisdiction} total={summary.activeCases} />}
            />
            <div className="vz-dash__row">
                <div className="vz-dash__main">
                    <DeadlinesPanel
                        title={selected ? 'Vencimientos del responsable' : 'Vencimientos del estudio'}
                        deadlines={deadlines}
                        urgency={urgency}
                        onUrgencyChange={setUrgency}
                        onOpen={onOpen}
                        showLawyer
                        extraActions={
                            selected && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    pressed
                                    aria-label={`Quitar el filtro de ${formatPersonName(selected)}`}
                                    onClick={() => setLawyerId(null)}
                                >
                                    {formatPersonName(selected)}
                                    <Icon name="close" size={13} />
                                </Button>
                            )
                        }
                    />
                </div>
                <div className="vz-dash__side">
                    <PrescriptionAlertsPanel alerts={dashboard.prescriptionAlerts} onOpen={onOpen} showLawyer />
                    <TeamLoadPanel team={dashboard.team} selectedLawyerId={lawyerId} onSelect={toggleLawyer} />
                </div>
            </div>
        </div>
    )
}