import { Outlet, useLocation, useNavigate } from 'react-router'
import {
    AppShell,
    IconButton,
    Logo,
    RailUser,
    SearchInput,
    type GrupoRail,
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
 */
const GRUPOS: GrupoRail[] = [
    {
        label: 'Trabajo diario',
        items: [
            { id: '/inicio', label: 'Inicio', icono: 'inicio' },
            { id: '/causas', label: 'Causas', icono: 'causas' },
            { id: '/vencimientos', label: 'Vencimientos', icono: 'vencimientos' },
            { id: '/clientes', label: 'Clientes', icono: 'clientes' },
            { id: '/modelos', label: 'Modelos', icono: 'modelos' },
        ],
    },
    {
        label: 'Administración',
        items: [
            { id: '/usuarios', label: 'Usuarios', icono: 'usuarios' },
            { id: '/abogados', label: 'Abogados', icono: 'abogados' },
            { id: '/estados-y-plazos', label: 'Estados y plazos', icono: 'plazos' },
            { id: '/reportes', label: 'Reportes', icono: 'reportes' },
        ],
    },
]

/**
 * Usuario de prueba hasta que exista el inicio de sesión (HU 1).
 * Cuando esté, el nombre y el perfil salen de la sesión y esto se borra.
 */
const USUARIO_PROVISORIO = { nombre: 'Fernando G. Vázquez', perfil: 'Administrador' }

export function AppLayout() {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    /* El ítem activo es aquel cuya ruta es la actual o el comienzo de la
       actual: estando en /usuarios/8 tiene que quedar marcado Usuarios. */
    const activo =
        GRUPOS.flatMap((g) => g.items)
            .map((it) => it.id)
            .find((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)) ?? ''

    return (
        <AppShell
            grupos={GRUPOS}
            activo={activo}
            onNavegar={(ruta) => navigate(ruta)}
            marca={<Logo />}
            barraSuperior={
                <>
                    <SearchInput placeholder="Buscar por carátula, SAC o cliente" aria-label="Buscar" />
                    <div className="vz-topbar__right">
                        <IconButton nombre="notificaciones" etiqueta="Notificaciones" />
                    </div>
                </>
            }
            pieRail={
                <RailUser
                    nombre={USUARIO_PROVISORIO.nombre}
                    perfil={USUARIO_PROVISORIO.perfil}
                    // Las dos acciones son de la épica de sesión (HU 2 y HU 3).
                    // Por ahora sólo la salida tiene a dónde ir.
                    onCambiarContrasena={() => {}}
                    onCerrarSesion={() => navigate('/login')}
                />
            }
        >
            <Outlet />
        </AppShell>
    )
}
