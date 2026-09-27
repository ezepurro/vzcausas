import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { logout } from './auth.api'

/**
 * Cierre de sesión.
 *
 * Acá no se limpia la caché, aunque sea una mutación: la caché entera
 * pertenece a la sesión, no a este endpoint, y hay tres formas de salir
 * (cerrar sesión a mano, un 401 en cualquier pantalla, o una sesión vencida
 * al rehidratar). Las tres terminan en `signOut()`, que es el único lugar
 * donde se limpia.
 */
export function useLogout() {
    return useMutation<void, ApiError, void>({
        mutationFn: logout,
    })
}
