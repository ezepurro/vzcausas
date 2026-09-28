import { Outlet, useLocation } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { canAccess } from '@/app/access/access'
import { ForbiddenPage } from '@/app/router/ForbiddenPage'

/**
 * Deja pasar sólo a quien tenga un rol que habilite la ruta actual, según
 * `ROUTE_ACCESS`. Va detrás de `RequireSession`, así que siempre hay alguien
 * adentro.
 *
 * Es una comodidad, no la seguridad: el backend rechaza igual con 403. Esto
 * evita que alguien entre a una pantalla que sólo le va a mostrar errores.
 */
export function RequireAccess() {
    const { roles } = useCurrentUser()
    const { pathname } = useLocation()

    if (!canAccess(roles, pathname)) return <ForbiddenPage />

    return <Outlet />
}
