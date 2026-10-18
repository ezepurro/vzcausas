import { useCurrentUser } from '@/app/providers/AuthContext'
import { homeRoute } from '@/app/access/access'

/** La pantalla de entrada del usuario de la sesión: Inicio o, sin tablero, Causas. */
export function useHomeRoute(): string {
    return homeRoute(useCurrentUser().roles)
}