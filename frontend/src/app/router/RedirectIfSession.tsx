import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'

/**
 * La guarda inversa: con la sesión abierta no hay nada que hacer en el login.
 *
 * Cubre el caso de escribir `/login` a mano estando adentro, que si no
 * mostraría un formulario para volver a entrar donde ya se está.
 */
export function RedirectIfSession() {
    const { session } = useAuth()
    return session === null ? <Outlet /> : <Navigate to="/inicio" replace />
}
