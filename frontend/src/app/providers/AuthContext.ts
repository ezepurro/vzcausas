import { createContext, useContext } from 'react'
import type { AuthUser, Session, StoredSession } from '@/features/auth/types/session'

/**
 * La sesión del usuario, disponible para toda la aplicación.
 *
 * Vive en `app/providers/` y no adentro de `features/auth/` por la primera
 * regla de la arquitectura: un módulo no importa de otro módulo. Si `useAuth()`
 * estuviera en el módulo de autenticación, el día que la pantalla de usuarios
 * necesite saber si quien está adentro es administrador tendría que
 * violarla. Acá queda con el mismo estatus que `useToast()`: un import legal
 * desde cualquier módulo.
 *
 * El contexto no tiene lógica: sólo la forma. El trabajo lo hace
 * `AuthProvider`, y las reglas de la sesión —qué se guarda, cómo se valida,
 * cuánto dura— viven en `features/auth/`.
 */
export interface AuthValue {
    /** La sesión abierta, o `null` si no hay nadie adentro. */
    session: StoredSession | null
    /** Abre la sesión con lo que devolvió el login y la persiste. */
    signIn: (session: Session) => void
    /** Cierra la sesión: borra lo guardado y vacía la caché. Es idempotente. */
    signOut: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
    const value = useContext(AuthContext)
    if (value === null) throw new Error('useAuth() must be used inside <AuthProvider>')
    return value
}

/**
 * El usuario de la sesión abierta.
 *
 * Sólo se puede usar detrás de la guarda de sesión, que es lo que garantiza
 * que haya alguien adentro. Si se llama sin sesión, revienta a propósito: es
 * un error de ruteo, no un caso a contemplar en cada pantalla.
 */
export function useCurrentUser(): AuthUser {
    const { session } = useAuth()
    if (session === null) throw new Error('useCurrentUser() requires an open session')
    return session.user
}
