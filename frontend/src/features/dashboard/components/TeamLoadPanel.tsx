import { Avatar, Meter, Panel, type MeterTone } from '@/shared/components/ui'
import { formatPersonFullName, formatPersonName } from '@/shared/lib/personName'
import type { TeamMember } from '@/features/dashboard/types/dashboard'
import { teamStatus } from '@/features/dashboard/utils/urgency'

interface TeamLoadPanelProps {
    /** Ya vienen por urgencia: primero quien tiene más vencidos (CA-42.7). */
    team: TeamMember[]
    /** El abogado elegido, o `null` si se ven los plazos de todo el estudio. */
    selectedLawyerId: number | null
    onSelect: (lawyerId: number) => void
}

/** Carga de un abogado según el prototipo: ~15 causas es lo normal, 17 o más es sobrecarga. */
function loadTone(activeCases: number): MeterTone {
    if (activeCases >= 17) return 'danger'
    if (activeCases >= 15) return 'warn'
    return 'primary'
}

/**
 * "Carga del equipo" (CA-42.6, CA-42.7, CA-42.10): cada abogado vigente, con
 * sus causas activas y un rótulo según lo más urgente que tenga. Tocar uno
 * deja sólo sus plazos en "Vencimientos del estudio"; la página decide qué
 * hacer con el toque.
 */
export function TeamLoadPanel({ team, selectedLawyerId, onSelect }: TeamLoadPanelProps) {
    // La barra se compara contra el abogado más cargado del estudio, como `LawyersTable`.
    const maxLoad = Math.max(1, ...team.map((member) => member.activeCases))

    return (
        <Panel title="Carga del equipo" sub="Tocá un abogado para ver solo sus vencimientos.">
            <div className="vz-dash-team">
                {team.map((member) => {
                    const status = teamStatus(member.openDeadlines)
                    const name = formatPersonName(member.lawyer)
                    return (
                        <button
                            key={member.lawyer.id}
                            type="button"
                            className="vz-dash-member"
                            aria-pressed={selectedLawyerId === member.lawyer.id}
                            onClick={() => onSelect(member.lawyer.id)}
                        >
                            <span className="vz-dash-member__top">
                                <Avatar name={formatPersonFullName(member.lawyer)} />
                                <span className="vz-dash-member__who">
                                    <span className="vz-dash-member__name">{name}</span>
                                    <span className={`vz-dash-member__status vz-dash-member__status--${status.tone}`}>
                                        {status.label}
                                    </span>
                                </span>
                                <span className="vz-dash-member__load">
                                    {member.activeCases}{' '}
                                    <span className="vz-dash-member__unit">
                                        {member.activeCases === 1 ? 'causa' : 'causas'}
                                    </span>
                                </span>
                            </span>
                            <Meter
                                value={member.activeCases}
                                max={maxLoad}
                                label={`Carga de ${name}`}
                                tone={loadTone(member.activeCases)}
                            />
                        </button>
                    )
                })}
            </div>
        </Panel>
    )
}