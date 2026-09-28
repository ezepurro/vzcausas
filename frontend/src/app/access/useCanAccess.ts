import { useCurrentUser } from '@/app/providers/AuthContext'
import { canAccess } from '@/app/access/access'

/** ¿El usuario de la sesión puede ver esta ruta? Sólo detrás de la guarda de sesión. */
export function useCanAccess(route: string): boolean {
    return canAccess(useCurrentUser().roles, route)
}