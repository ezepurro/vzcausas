import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'

/**
 * Deja pasar sólo a quien tenga la sesión abierta.
 *
 * Al desviar, se lleva anotado a dónde quería ir, así después de iniciar
 * sesión vuelve ahí y no a la pantalla de inicio. Se guarda como texto —la
 * ruta y sus parámetros— y no el objeto de ubicación entero: es lo único que
 * hace falta para volver.
 *
 * Quien lee ese `from` es `RedirectIfSession`, no `LoginPage`: la pantalla de
 * login no navega. Si cambiás el nombre de la clave, cambiala en los dos.
 *
 * **No se anota si la persona pidió salir.** Desde acá, que te eche un token
 * vencido y que cliquees "Cerrar sesión" se ven igual: en los dos casos la
 * sesión pasa a nulo estando en una pantalla privada. Pero sólo el primero
 * merece que te devuelvan ahí. Si no se distinguieran, en una máquina
 * compartida el próximo que entre aterrizaría en la pantalla del anterior.
 */
export function RequireSession() {
    const { session, leftOnPurpose } = useAuth()
    const location = useLocation()

    if (session === null) {
        const from = leftOnPurpose ? undefined : `${location.pathname}${location.search}`
        return <Navigate to="/login" replace state={from && { from }} />
    }

    return <Outlet />
}
