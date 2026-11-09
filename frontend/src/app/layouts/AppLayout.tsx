import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import {
    AppShell,
    Button,
    Icon,
    IconButton,
    Logo,
    RailUser,
    type RailGroup,
} from '@/shared/components/ui'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useToast } from '@/app/providers/ToastContext'
import { isApiError } from '@/shared/api/ApiError'
import { formatPersonFullName } from '@/shared/lib/personName'
import { profileLabel } from '@/features/auth/utils/profileLabel'
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal'
import { LogoutConfirmModal } from '@/features/auth/components/LogoutConfirmModal'
import { DAILY_RUN_ENABLED, useRunDailyNotifications } from '@/features/deadlines'
import { canAccess, matchRoute } from '@/app/access/access'
import { useHomeRoute } from '@/app/access/useHomeRoute'
import { preloadSection } from '@/app/router/pages'
import { NavigationProgress } from '@/app/layouts/NavigationProgress'
import { useHoverIntent } from '@/shared/hooks/useHoverIntent'

/**
 * Marco de la aplicación con sesión iniciada: rail oscuro a la izquierda,
 * barra superior y el contenido de la ruta.
 *
 * El AppShell es presentacional y no sabe de rutas: recibe qué ítem está
 * activo y avisa cuando tocan otro. Acá se hace esa traducción contra
 * react-router.
 */

/**
 * Los dos grupos del rail, tal como están en el prototipo. El `id` de cada
 * ítem es su ruta, así no hace falta una tabla aparte para traducir de ítem
 * a URL.
 *
 * Están todas las secciones del menú del prototipo, no sólo las del sprint:
 * se navega la aplicación entera desde el primer día. Las que todavía no
 * tienen pantalla caen en la ruta de "no encontrada" del router.
 * "Vencimientos" no está: el prototipo la sacó del menú.
 *
 * Las rutas y las etiquetas quedan en castellano a propósito: son parte del
 * producto, que es en castellano. Lo que está en inglés es el código.
 */
const GROUPS: RailGroup[] = [
    {
        label: 'Trabajo diario',
        items: [
            { id: '/inicio', label: 'Inicio', icon: 'home' },
            { id: '/causas', label: 'Causas', icon: 'cases' },
            { id: '/clientes', label: 'Clientes', icon: 'clients' },
            { id: '/modelos', label: 'Modelos', icon: 'templates' },
            { id: '/herramientas', label: 'Herramientas', icon: 'tools' },
        ],
    },
    {
        label: 'Administración',
        items: [
            { id: '/usuarios', label: 'Usuarios', icon: 'users' },
            { id: '/abogados', label: 'Abogados', icon: 'lawyers' },
            { id: '/estados-y-plazos', label: 'Estados y plazos', icon: 'timeLimits' },
            { id: '/calificaciones-legales', label: 'Calificaciones legales', icon: 'qualifications' },
            { id: '/reportes', label: 'Reportes', icon: 'reports' },
        ],
    },
]

/** La sección de la que cuelga el alta: de ella hereda el permiso. */
const CASES = '/causas'

export function AppLayout() {
    const navigate = useNavigate()
    // "Nueva causa" adelanta la pantalla del alta, como los ítems del rail.
    const newCaseIntent = useHoverIntent(preloadSection)
    const { pathname } = useLocation()

    /* Este marco vive detrás de la guarda de sesión, así que siempre hay
       alguien adentro: el nombre y el perfil salen de ahí. */
    const user = useCurrentUser()

    /* El logo lleva a la pantalla de entrada del perfil: Inicio o, para la
       Secretaría, que no tiene tablero, Causas. */
    const homeRoute = useHomeRoute()

    /* El rail muestra sólo lo que el perfil puede abrir, con la misma regla que
       aplica la guarda de rutas. Un grupo que se queda sin ítems no se muestra:
       un título sin nada abajo confunde más de lo que ayuda. */
    const groups = GROUPS
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => canAccess(user.roles, item.id)),
        }))
        .filter((group) => group.items.length > 0)

    const [changingPassword, setChangingPassword] = useState(false)
    const [confirmingLogout, setConfirmingLogout] = useState(false)

    /* El ítem activo es aquel cuya ruta es la actual o el comienzo de la
       actual: estando en /usuarios/8 tiene que quedar marcado Usuarios. */
    const active = matchRoute(pathname) ?? ''

    const toast = useToast()
    const dailyRun = useRunDailyNotifications()

    /* Atajo local para probar los correos: ver `features/deadlines/CAMBIOS.md`. */
    function runDailyNotifications() {
        dailyRun.mutate(undefined, {
            onSuccess: (result) => {
                const sent = Number(result.mailboxSent)
                    + result.lawyerSends.filter((lawyer) => lawyer.sent).length

                if (sent === 0) toast('info', 'No se envió ningún correo.')
                else toast('success', `Correos enviados: ${sent}.`)
            },
            onError: (error) => {
                toast('error', isApiError(error) ? error.message : 'Ocurrió un error inesperado.')
            },
        })
    }

    return (
        <>

        <AppShell
            groups={groups}
            active={active}
            onNavigate={(route) => navigate(route)}
            // Al apuntar a una sección se descarga su pantalla: el click la encuentra lista.
            onIntent={preloadSection}
            brand={
                <Link to={homeRoute} className="vz-rail__brand" aria-label="Ir al inicio">
                    <Logo />
                </Link>
            }
            // En pantallas angostas el rail está guardado: la barra lleva el logo.
            topBarBrand={
                <Link to={homeRoute} className="vz-rail__brand" aria-label="Ir al inicio">
                    <Logo />
                </Link>
            }
            railAction={
                /* "Nueva causa" bajo el logo, como el prototipo: registrar una
                   causa la puede hacer cualquier perfil (RN11), así que el
                   botón sigue el mismo permiso que la sección de la que
                   cuelga. */
                canAccess(user.roles, CASES) && (
                    <Button
                        block
                        size="md"
                        icon={<Icon name="plus" size={15} />}
                        title="Nueva causa"
                        onClick={() => navigate(`${CASES}/nueva`)}
                        {...newCaseIntent(`${CASES}/nueva`)}
                    >
                        <span className="vz-rail__action-label">Nueva causa</span>
                    </Button>
                )
            }
            topBar={
                    <>
                    {/* Mientras se descarga la pantalla de destino (`lazy`). */}
                    <NavigationProgress />
                    <div className="vz-topbar__right">
                        <IconButton
                            name="notifications"
                            label="Notificaciones"
                            disabled={dailyRun.isPending}
                            onClick={DAILY_RUN_ENABLED ? runDailyNotifications : undefined}
                        />
                    </div>
                    </>
            }
            railFooter={
                <RailUser
                    name={formatPersonFullName(user)}
                    profile={profileLabel(user.roles)}
                    onChangePassword={() => setChangingPassword(true)}
                    onLogout={() => setConfirmingLogout(true)}
                />
            }
        >
            <Outlet />
        </AppShell>

        {changingPassword && (
            <ChangePasswordModal onClose={() => setChangingPassword(false)} />
        )}

        {confirmingLogout && (
            <LogoutConfirmModal onClose={() => setConfirmingLogout(false)} />
        )}
        </>
    )
}
