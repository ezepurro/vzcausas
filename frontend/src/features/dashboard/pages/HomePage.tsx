import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useCan } from '@/app/access/useCan'
import { isApiError } from '@/shared/api/ApiError'
import { PageHeader, Tabs } from '@/shared/components/ui'
import { formatPersonFullName } from '@/shared/lib/personName'
import { useLawyerDashboard } from '@/features/dashboard/api/useLawyerDashboard'
import { useAdministratorDashboard } from '@/features/dashboard/api/useAdministratorDashboard'
import { LawyerDashboardView } from '@/features/dashboard/components/LawyerDashboardView'
import { AdministratorDashboardView } from '@/features/dashboard/components/AdministratorDashboardView'
import { longDate } from '@/features/dashboard/utils/dashboardDate'

type Board = 'lawyer' | 'administrator'

const BOARD_TABS: { id: Board; label: string }[] = [
    { id: 'lawyer', label: 'Mi día' },
    { id: 'administrator', label: 'Estudio' },
]

/** Lo que sigue a la fecha en el subtítulo, según el tablero (prototipo). */
const SUBTITLES: Record<Board, string> = {
    lawyer: 'tus causas pendientes y los plazos por vencer',
    administrator: 'panorama consolidado de la cartera del estudio',
}

/**
 * Inicio: los tableros (HU-41, HU-42). El Abogado ve "Mi día"; el
 * Administrador, "Estudio"; quien es las dos cosas ve las dos pestañas y
 * arranca en "Mi día" (CA-41.7). La Secretaría no llega acá: entra directo a
 * Causas.
 *
 * La página pide el tablero de la pestaña activa y lo pasa armado a su vista.
 */
export function HomePage() {
    const user = useCurrentUser()
    const navigate = useNavigate()
    const hasLawyerBoard = useCan('dashboard.lawyer')
    const hasAdministratorBoard = useCan('dashboard.administrator')
    const [board, setBoard] = useState<Board>(hasLawyerBoard ? 'lawyer' : 'administrator')

    // Sólo sale la consulta de la pestaña que se ve: a quien no tiene el rol
    // el backend le respondería 403.
    const lawyerQuery = useLawyerDashboard({ enabled: hasLawyerBoard && board === 'lawyer' })
    const administratorQuery = useAdministratorDashboard({
        enabled: hasAdministratorBoard && board === 'administrator',
    })
    const query = board === 'lawyer' ? lawyerQuery : administratorQuery

    const openCase = (caseId: number) => navigate(`/causas/${caseId}`)

    function renderBoard() {
        if (query.isPending) {
            return (
                <div className="vz-empty">
                    <div className="vz-empty__title">Cargando el tablero…</div>
                </div>
            )
        }
        if (query.isError) {
            return (
                <div className="vz-empty">
                    <div className="vz-empty__title">No se pudo cargar el tablero</div>
                    <div className="vz-empty__text">
                        {isApiError(query.error) ? query.error.message : 'Ocurrió un error inesperado.'}
                    </div>
                </div>
            )
        }
        if (board === 'lawyer' && lawyerQuery.data) {
            return <LawyerDashboardView dashboard={lawyerQuery.data} onOpen={openCase} />
        }
        if (board === 'administrator' && administratorQuery.data) {
            return <AdministratorDashboardView dashboard={administratorQuery.data} onOpen={openCase} />
        }
        return null
    }

    return (
        <>
            <PageHeader
                eyebrow="Trabajo diario"
                title={`Buen día, ${formatPersonFullName(user)}`}
                sub={query.data ? `${longDate(query.data.date)} · ${SUBTITLES[board]}` : undefined}
            />
            {hasLawyerBoard && hasAdministratorBoard && (
                <Tabs tabs={BOARD_TABS} active={board} onChange={setBoard} />
            )}
            {renderBoard()}
        </>
    )
}