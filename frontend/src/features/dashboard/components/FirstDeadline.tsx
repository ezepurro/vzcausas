import { Icon } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import type { DashboardDeadline } from '@/features/dashboard/types/dashboard'
import { URGENCY_TONES, dueText, urgencyOf } from '@/features/dashboard/utils/urgency'

interface FirstDeadlineProps {
    /** El primer plazo del tablero, que ya viene por urgencia. Sin plazos, `undefined`. */
    deadline: DashboardDeadline | undefined
    onOpen: (caseId: number) => void
}

/**
 * "Lo primero de hoy" (CA-41.12): el plazo más urgente del abogado, a la
 * derecha de la banda de indicadores. Toda la tarjeta abre la causa.
 */
export function FirstDeadline({ deadline, onOpen }: FirstDeadlineProps) {
    return (
        <>
            <div className="vz-dash-first__title">Lo primero de hoy</div>

            {deadline ? (
                <button
                    type="button"
                    className="vz-dash-first"
                    aria-label={`Ver causa ${deadline.caption}`}
                    onClick={() => onOpen(deadline.caseId)}
                >
                    <span className="vz-dash-first__body">
                        <span
                            className={`vz-dash-first__when vz-dash-first__when--${URGENCY_TONES[urgencyOf(deadline.businessDaysRemaining)]}`}
                        >
                            {dueText(deadline.businessDaysRemaining)}
                            <span className="vz-dash-first__date"> · {formatDate(deadline.dueDate)}</span>
                        </span>
                        <span className="vz-dash-first__caption">{deadline.caption}</span>
                        <span className="vz-dash-first__state">{deadline.currentStateName}</span>
                    </span>
                    <Icon name="forward" size={18} className="vz-dash-first__arrow" />
                </button>
            ) : (
                <>
                    <div className="vz-dash-first__empty-title">Sin plazos abiertos</div>
                    <div className="vz-dash-first__empty-text">
                        Ninguna de tus causas tiene un plazo de presentación en curso.
                    </div>
                </>
            )}
        </>
    )
}