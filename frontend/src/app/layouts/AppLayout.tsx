import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import {
    AppShell,
    IconButton,
    Logo,
    RailUser,
    SearchInput,
    type RailGroup,
} from '@/shared/components/ui'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { profileLabel } from '@/features/auth/utils/profileLabel'
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal'
import { LogoutConfirmModal } from '@/features/auth/components/LogoutConfirmModal'
import { canAccess, matchRoute } from '@/app/access/access'

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
 * Están TODAS las secciones del sistema, no sólo las del sprint: se navega
 * la aplicación entera desde el primer día. Las que todavía no tienen
 * pantalla caen en la ruta de "no encontrada" del router.
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
            { id: '/vencimientos', label: 'Vencimientos', icon: 'deadlines' },
            { id: '/clientes', label: 'Clientes', icon: 'clients' },
            { id: '/modelos', label: 'Modelos', icon: 'templates' },
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

export function AppLayout() {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    /* Este marco vive detrás de la guarda de sesión, así que siempre hay
       alguien adentro: el nombre y el perfil salen de ahí. */
    const user = useCurrentUser()

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

    return (
        <>

        <AppShell
            groups={groups}
            active={active}
            onNavigate={(route) => navigate(route)}
            brand={<Logo />}
            topBar={
                <>
                    <SearchInput placeholder="Buscar por carátula, SAC o cliente" aria-label="Buscar" />
                    <div className="vz-topbar__right">
                        <IconButton name="notifications" label="Notificaciones" />
                    </div>
                </>
            }
            railFooter={
                <RailUser
                    name={user.fullName}
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
