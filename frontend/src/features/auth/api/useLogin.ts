import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { login } from './auth.api'
import type { Session } from '@/features/auth/types/session'
import type { LoginBody } from '@/features/auth/types/credentials'

/**
 * Inicio de sesión.
 *
 * No toca la caché: cuando alguien llega al login, la caché ya está vacía
 * —todo camino de salida pasa por `signOut()`, que la limpia—. Tampoco
 * guarda la sesión: de eso se encarga la pantalla llamando a `signIn()`, que
 * es quien sabe además a dónde navegar después.
 */
export function useLogin() {
    return useMutation<Session, ApiError, LoginBody>({
        mutationFn: login,
    })
}
