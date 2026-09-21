import { TOKEN_KEY } from '@/shared/api/http'
import { ROLES, type AuthUser, type Role, type Session, type StoredSession } from '@/features/auth/types/session'

/**
 * El único lugar de todo el front que toca el almacenamiento del navegador.
 *
 * Está concentrado acá a propósito. La forma de guardar la sesión es una
 * decisión provisoria: el equipo de backend todavía discute si el token va a
 * viajar en una cookie `httpOnly` —que el front no puede leer ni escribir— o
 * en el cuerpo, como dice hoy el contrato. Cuando eso se resuelva, se
 * reescribe este archivo y ni las pantallas ni los hooks se enteran.
 *
 * Por qué se guarda el usuario entero y no sólo el token: el contrato no
 * publica un `GET /users/me`, así que después de una recarga no hay forma de
 * volver a preguntar quién está adentro. O se guarda, o cada F5 manda al
 * login.
 *
 * El token va bajo la clave que `http.ts` ya lee, y como string pelado: el
 * interceptor lo necesita en cada pedido y no tiene por qué parsear JSON.
 */

/** El resto de la sesión, al lado del token. */
const SESSION_KEY = 'vz.session'

/** Lo que se serializa bajo `vz.session`. */
interface StoredPayload {
    user: AuthUser
    expiresAt: number
}

function isRole(value: unknown): value is Role {
    return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/**
 * Comprueba que lo que salió del almacenamiento tenga la forma esperada.
 *
 * No es paranoia: son datos que el usuario puede editar a mano desde las
 * herramientas del navegador, y que además pueden haber quedado de una
 * versión anterior de la aplicación con otros campos. Si no cierra, se
 * descarta y se vuelve al login, que es lo seguro.
 */
function isAuthUser(value: unknown): value is AuthUser {
    if (typeof value !== 'object' || value === null) return false
    const user = value as Record<string, unknown>

    return (
        typeof user.id === 'number' &&
        typeof user.username === 'string' &&
        typeof user.fullName === 'string' &&
        typeof user.email === 'string' &&
        Array.isArray(user.roles) &&
        user.roles.every(isRole) &&
        (user.lawyer === null || typeof user.lawyer === 'object') &&
        (user.lastLoginAt === null || typeof user.lastLoginAt === 'string') &&
        typeof user.active === 'boolean'
    )
}

/**
 * La sesión guardada, o `null` si no hay ninguna utilizable.
 *
 * Devuelve `null` —y limpia lo que haya— cuando falta el token, cuando el
 * contenido no tiene la forma esperada, o cuando el token ya venció. Como no
 * existe renovación de token, un vencimiento es final: hay que volver a
 * entrar.
 */
export function readStoredSession(): StoredSession | null {
    try {
        const accessToken = localStorage.getItem(TOKEN_KEY)
        const raw = localStorage.getItem(SESSION_KEY)
        if (accessToken === null || raw === null) {
            clearStoredSession()
            return null
        }

        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed !== 'object' || parsed === null) {
            clearStoredSession()
            return null
        }

        const { user, expiresAt } = parsed as Partial<StoredPayload>
        if (typeof expiresAt !== 'number' || !isAuthUser(user)) {
            clearStoredSession()
            return null
        }

        if (expiresAt <= Date.now()) {
            clearStoredSession()
            return null
        }

        return { accessToken, user, expiresAt }
    } catch {
        // JSON corrupto, o un navegador con el almacenamiento bloqueado.
        clearStoredSession()
        return null
    }
}

/**
 * Guarda la sesión que devolvió el login y la entrega ya normalizada, con el
 * vencimiento resuelto a una fecha concreta.
 */
export function writeStoredSession(session: Session): StoredSession {
    const stored: StoredSession = {
        accessToken: session.accessToken,
        user: session.user,
        expiresAt: Date.now() + session.expiresIn * 1000,
    }

    try {
        localStorage.setItem(TOKEN_KEY, stored.accessToken)
        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ user: stored.user, expiresAt: stored.expiresAt } satisfies StoredPayload),
        )
    } catch {
        /* Si el navegador no deja escribir (modo privado, cuota llena), la
           sesión igual funciona hasta que se recargue la página: el valor
           devuelto es el que queda en memoria. Peor sería no dejar entrar. */
    }

    return stored
}

/** Borra todo rastro de la sesión. Se puede llamar las veces que haga falta. */
export function clearStoredSession(): void {
    try {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(SESSION_KEY)
    } catch {
        /* Nada que hacer: si no se puede escribir, tampoco se pudo guardar. */
    }
}
