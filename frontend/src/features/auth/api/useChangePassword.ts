import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { changePassword } from './auth.api'
import type { ChangePasswordBody } from '@/features/auth/types/credentials'

/**
 * Cambio de la propia contraseña.
 *
 * No hay nada que invalidar: la contraseña no está en ninguna caché —el
 * contrato aclara que no se devuelve en ninguna respuesta, ni en texto plano
 * ni cifrada— y la sesión queda abierta, así que tampoco se toca.
 */
export function useChangePassword() {
    return useMutation<void, ApiError, ChangePasswordBody>({
        mutationFn: changePassword,
    })
}
