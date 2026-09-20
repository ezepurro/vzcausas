import { Outlet, useLocation, useNavigate } from 'react-router'
import {
    AppShell,
    IconButton,
    Logo,
    RailUser,
    SearchInput,
    type RailGroup,
} from '@/shared/components/ui'

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
            { id: '/reportes', label: 'Reportes', icon: 'reports' },
        ],
    },
]

/**
 * Usuario de prueba hasta que exista el inicio de sesión (HU 1).
 * Cuando esté, el nombre y el perfil salen de la sesión y esto se borra.
 */
const PLACEHOLDER_USER = { name: 'Fernando G. Vázquez', profile: 'Administrador' }

export function AppLayout() {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    /* El ítem activo es aquel cuya ruta es la actual o el comienzo de la
       actual: estando en /usuarios/8 tiene que quedar marcado Usuarios. */
    const active =
        GROUPS.flatMap((g) => g.items)
            .map((it) => it.id)
            .find((route) => pathname === route || pathname.startsWith(`${route}/`)) ?? ''

    return (
        <AppShell
            groups={GROUPS}
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
                    name={PLACEHOLDER_USER.name}
                    profile={PLACEHOLDER_USER.profile}
                    // Las dos acciones son de la épica de sesión (HU 2 y HU 3).
                    // Por ahora sólo la salida tiene a dónde ir.
                    onChangePassword={() => {}}
                    onLogout={() => navigate('/login')}
                />
            }
        >
            <Outlet />
        </AppShell>
    )
}
