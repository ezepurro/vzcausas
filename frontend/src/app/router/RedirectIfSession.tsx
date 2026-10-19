import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'
import { homeRoute } from '@/app/access/access'

/**
 * La guarda inversa: con la sesión abierta no hay nada que hacer en el login.
 *
 * Cubre dos casos con la misma regla. Escribir `/login` a mano estando
 * adentro, que si no mostraría un formulario para volver a entrar donde ya se
 * está; y el instante justo después de iniciar sesión, cuando la sesión ya
 * existe pero la ubicación todavía es `/login`.
 *
 * **Éste es el único lugar que decide a dónde va alguien con la sesión
 * abierta.** No es un detalle de estilo. `AuthProvider` está por encima de
 * `RouterProvider`, así que la sesión y la ubicación son dos estados con
 * dueños distintos: `signIn()` es un `setState` sincrónico y `navigate()` de
 * un data router no lo es. Queda un render intermedio —sesión nueva, URL
 * vieja— en el que esta guarda se dibuja igual. Cuando `LoginPage` también
 * navegaba, las dos redirecciones competían y ganaba la de acá por salir de
 * un efecto: se perdía la pantalla que la persona había pedido. Con un solo
 * navegante la carrera no puede existir.
 *
 * El `from` lo anota `RequireSession` al desviar a alguien sin sesión. Quien
 * entra sin haber pedido antes otra pantalla va a su pantalla de entrada
 * (`homeRoute`): Inicio, o Causas si no tiene tablero.
 */
export function RedirectIfSession() {
    const { session } = useAuth()
    const location = useLocation()

    if (session === null) return <Outlet />

    const from = (location.state as { from?: string } | null)?.from ?? homeRoute(session.user.roles)
    return <Navigate to={from} replace />
}
