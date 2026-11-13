import { useNavigate } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useCan } from '@/app/access/useCan'
import { PageHeader, Tabs, LoadError } from '@/shared/components/ui'
import { formatPersonFullName } from '@/shared/lib/personName'
import { useLawyerDashboard } from '@/features/dashboard/api/useLawyerDashboard'
import { useAdministratorDashboard } from '@/features/dashboard/api/useAdministratorDashboard'
import { LawyerDashboardView } from '@/features/dashboard/components/LawyerDashboardView'
import { AdministratorDashboardView } from '@/features/dashboard/components/AdministratorDashboardView'
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton'
import { longDate } from '@/features/dashboard/utils/dashboardDate'
import { useDashboardFilters, type Board } from '@/features/dashboard/hooks/useDashboardFilters'
import { usePageTitle } from '@/shared/hooks/usePageTitle'

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
 * El tablero que se muestra: "Estudio" sólo si se eligió y el usuario lo
 * tiene; si no, "Mi día", con el que arranca quien tiene los dos (CA-41.7).
 */
function visibleBoard(chosen: Board | null, hasLawyerBoard: boolean, hasAdministratorBoard: boolean): Board {
    if (chosen === 'administrator' && hasAdministratorBoard) return 'administrator'
    return hasLawyerBoard ? 'lawyer' : 'administrator'
}

/**
 * Inicio: los tableros (HU-41, HU-42). El Abogado ve "Mi día"; el
 * Administrador, "Estudio"; quien es las dos cosas ve las dos pestañas y
 * arranca en "Mi día" (CA-41.7). La Secretaría no llega acá: entra directo a
 * Causas.
 *
 * La página pide el tablero de la pestaña activa y lo pasa armado a su vista.
 */
/** El `id` del contenedor que cambia con la pestaña (`aria-controls`). */
const BOARD_PANEL_ID = 'home-board-panel'

export function HomePage() {
    usePageTitle('Inicio')
    const user = useCurrentUser()
    const navigate = useNavigate()
    const hasLawyerBoard = useCan('dashboard.lawyer')
    const hasAdministratorBoard = useCan('dashboard.administrator')
    /* La pestaña que eligió la persona, y la que se muestra. No son la misma
       porque los roles pueden cambiar con la pantalla abierta: si la elegida
       es de un tablero que ya no tiene, se muestra el que sí. Si no, su
       consulta quedaría deshabilitada y el esqueleto, para siempre. La elegida
       vive en la URL, para que siga elegida al volver de una causa. */
    const { board: chosen, setBoard } = useDashboardFilters()
    const board = visibleBoard(chosen, hasLawyerBoard, hasAdministratorBoard)
    // Tocar la pestaña que ya se ve no limpia sus filtros.
    const changeBoard = (next: Board) => {
        if (next !== board) setBoard(next)
    }

    // Sólo sale la consulta de la pestaña que se ve: a quien no tiene el rol
    // el backend le respondería 403.
    const lawyerQuery = useLawyerDashboard({ enabled: hasLawyerBoard && board === 'lawyer' })
    const administratorQuery = useAdministratorDashboard({
        enabled: hasAdministratorBoard && board === 'administrator',
    })
    const query = board === 'lawyer' ? lawyerQuery : administratorQuery

    const openCase = (caseId: number) => navigate(`/causas/${caseId}`)

    function renderBoard() {
        if (query.isPending) return <DashboardSkeleton board={board} />
        if (query.isError) {
            return (
                <LoadError title="No se pudo cargar el tablero" error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
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
            {hasLawyerBoard && hasAdministratorBoard ? (
                <>
                    <Tabs
                        tabs={BOARD_TABS}
                        active={board}
                        onChange={changeBoard}
                        aria-label="Tableros"
                        panelId={BOARD_PANEL_ID}
                    />
                    {/* El panel de la pestaña elegida: un lector de pantalla
                        salta de la pestaña a su contenido (H-41). */}
                    <div
                        id={BOARD_PANEL_ID}
                        role="tabpanel"
                        aria-label={BOARD_TABS.find((tab) => tab.id === board)?.label}
                    >
                        {renderBoard()}
                    </div>
                </>
            ) : (
                renderBoard()
            )}
        </>
    )
}