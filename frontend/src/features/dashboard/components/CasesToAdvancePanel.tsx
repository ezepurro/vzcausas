import { Button, Panel } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import type { CaseToAdvance } from '@/features/dashboard/types/dashboard'

interface CasesToAdvancePanelProps {
    /** Ya vienen ordenadas: primero las que llevan más tiempo sin movimiento. */
    cases: CaseToAdvance[]
    onOpen: (caseId: number) => void
}

/**
 * "Causas para impulsar" (CA-41.4): las causas del abogado sin ningún plazo
 * corriendo, con cuánto hace que no se mueven.
 */
export function CasesToAdvancePanel({ cases, onOpen }: CasesToAdvancePanelProps) {
    return (
        <Panel
            title="Causas para impulsar"
            sub="Sin plazo abierto: el impulso procesal depende del estudio, no del tribunal."
        >
            {cases.length === 0 ? (
                <div className="vz-empty">
                    <div className="vz-empty__text">Todas tus causas tienen un plazo en curso.</div>
                </div>
            ) : (
                <ul className="vz-dash-rows vz-dash-rows--scroll">
                    {cases.map((item) => (
                        <li key={item.caseId} className="vz-dash-advance">
                            <div className="vz-dash-advance__since">
                                <span className="vz-dash-advance__days">{item.daysSinceLastAct ?? '—'}</span>{' '}
                                <span className="vz-dash-advance__unit">
                                    {item.daysSinceLastAct === 1 ? 'día' : 'días'}
                                </span>
                            </div>
                            <div className="vz-dash-advance__body">
                                <div className="vz-dash-advance__caption">{item.caption}</div>
                                <div className="vz-dash-advance__meta">
                                    {item.currentStateName} ·{' '}
                                    {item.lastActDate ? (
                                        <>última actuación <time dateTime={item.lastActDate}>{formatDate(item.lastActDate)}</time></>
                                    ) : (
                                        'sin actuaciones'
                                    )}
                                </div>
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => onOpen(item.caseId)}>
                                Ver detalle
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    )
}