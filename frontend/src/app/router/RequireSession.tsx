import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'

/**
 * Deja pasar sólo a quien tenga la sesión abierta.
 *
 * Al desviar, se lleva anotado a dónde quería ir, así después de iniciar
 * sesión vuelve ahí y no a la pantalla de inicio. Se guarda como texto —la
 * ruta y sus parámetros— y no el objeto de ubicación entero: es lo único que
 * hace falta para volver.
 */
export function RequireSession() {
    const { session } = useAuth()
    const location = useLocation()

    if (session === null) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: `${location.pathname}${location.search}` }}
            />
        )
    }

    return <Outlet />
}
