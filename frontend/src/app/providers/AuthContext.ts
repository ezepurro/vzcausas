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
/**
 * Por qué se cerró la sesión.
 *
 * No es decoración: de esto depende si después del login se vuelve a la
 * pantalla en la que se estaba. A quien lo echó un token vencido hay que
 * devolverlo a donde estaba; quien pidió salir empieza de cero, que además es
 * lo correcto en una máquina compartida.
 */
export type SignOutReason = 'user' | 'expired'

export interface AuthValue {
    /** La sesión abierta, o `null` si no hay nadie adentro. */
    session: StoredSession | null
    /** Abre la sesión con lo que devolvió el login y la persiste. */
    signIn: (session: Session) => void
    /**
     * Cierra la sesión: borra lo guardado y vacía la caché. Es idempotente.
     * El motivo por defecto es `'expired'`, que es el caso conservador:
     * recuerda la pantalla. Quien cierra sesión a mano pasa `'user'`.
     */
    signOut: (reason?: SignOutReason) => void
    /**
     * `true` si la última salida fue a pedido de la persona.
     *
     * Lo consume `RequireSession` para decidir si anota la pantalla actual.
     * Se actualiza junto con `session`, así que llega en el mismo render en
     * que la sesión pasa a nulo.
     */
    leftOnPurpose: boolean
    /**
     * Trae del servidor los roles y la ficha actuales del usuario y los pone
     * en la sesión (`POST /auth/refresh`). Devuelve la sesión que quedó, o
     * `null` si el servidor ya no la reconoce: en ese caso la cierra.
     *
     * Corre sola al abrir la aplicación. Sin red, se sigue con la sesión
     * guardada: el backend igual autoriza cada pedido con los roles reales.
     */
    syncSession: () => Promise<StoredSession | null>
    /**
     * Reemplaza el usuario de la sesión con lo que se sabe de él, sin ir al
     * servidor. Es para quien se modifica a sí mismo: el `PATCH` ya devolvió
     * el usuario actualizado. `lastLoginAt` se conserva el del login.
     */
    updateCurrentUser: (user: Omit<AuthUser, 'lastLoginAt'>) => StoredSession | null
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
