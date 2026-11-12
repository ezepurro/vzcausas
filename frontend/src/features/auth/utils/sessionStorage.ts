import { TOKEN_KEY } from '@/shared/api/http'
import {
    ROLES,
    type AuthUser,
    type RefreshedSession,
    type Role,
    type Session,
    type StoredSession,
} from '@/features/auth/types/session'

/**
 * El único lugar de todo el front que toca el almacenamiento del navegador.
 *
 * Está concentrado acá a propósito: si mañana cambia dónde vive la sesión, se
 * reescribe este archivo y ni las pantallas ni los hooks se enteran.
 *
 * Acá se guarda **sólo el token de acceso**, que es el que viaja en cada
 * pedido. El token de renovación no pasa por acá ni podría: vive en una
 * cookie `httpOnly` que este código no puede leer ni escribir, y de eso se
 * trata —si un script malicioso entra a la página, se lleva quince minutos de
 * acceso y no siete días—.
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
        typeof user.lastName === 'string' &&
        typeof user.firstName === 'string' &&
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
 * Devuelve `null` —y limpia lo que haya— cuando falta el token o cuando el
 * contenido no tiene la forma esperada.
 *
 * **Un token de acceso vencido no invalida la sesión.** Dura quince minutos;
 * la cookie de renovación, siete días. Si esta función descartara la sesión
 * al vencer el token, la renovación —que la necesita para saber quién está
 * adentro— no tendría sobre qué trabajar, y la cookie no serviría nunca: era
 * el bug que cerraba la sesión a los quince minutos. Quien decide si la
 * sesión terminó es `POST /auth/refresh`: si responde 401, `AuthProvider`
 * cierra la sesión. `expiresAt` queda como dato (`isAccessTokenExpired`).
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

        return { accessToken, user, expiresAt }
    } catch {
        // JSON corrupto, o un navegador con el almacenamiento bloqueado.
        clearStoredSession()
        return null
    }
}

/** Si el token de acceso de la sesión ya venció según el reloj local. */
export function isAccessTokenExpired(session: StoredSession, now: number = Date.now()): boolean {
    return session.expiresAt <= now
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

/**
 * Guarda el token renovado sobre la sesión que ya estaba abierta.
 *
 * De la renovación se toma lo que puede cambiar entre sesión y sesión y que
 * decide qué ve cada uno (V4 §3.1): los **roles** y la **ficha profesional**.
 * El resto del usuario —apellido, nombres, correo— se conserva del login: la
 * renovación no lo trae, y pisarlo dejaría el rail sin nombre.
 *
 * La ficha llega sólo como `lawyerId`:
 * - si es la misma que la de la sesión, se conserva;
 * - si es `null`, la sesión queda sin ficha;
 * - si es otra, también queda sin ficha, y `AuthProvider` la completa con
 *   `GET /lawyers/{lawyerId}`. Conservar la vieja daría por responsable de
 *   sus causas a quien ya no lo es.
 *
 * Si el token renovado viniera de otra persona —lo que sólo podría pasar por
 * un error del backend— se descarta todo y se devuelve `null`: es preferible
 * mandar al login antes que mostrarle a alguien los datos de otro.
 */
export function writeRefreshedSession(
    current: StoredSession,
    refreshed: RefreshedSession,
): StoredSession | null {
    if (refreshed.user.id !== current.user.id) {
        clearStoredSession()
        return null
    }

    const { lawyer } = current.user
    const sameLawyer = lawyer !== null && lawyer.id === refreshed.user.lawyerId

    return writeStoredSession({
        accessToken: refreshed.accessToken,
        tokenType: refreshed.tokenType,
        expiresIn: refreshed.expiresIn,
        user: { ...current.user, roles: refreshed.user.roles, lawyer: sameLawyer ? lawyer : null },
    })
}

/**
 * Reemplaza el usuario de la sesión abierta, sin tocar el token ni su
 * vencimiento.
 *
 * Es para cuando se sabe algo nuevo del usuario sin haber renovado: la ficha
 * que se completó después de una renovación, o lo que devolvió el
 * `PATCH /users/{userId}` de quien se modificó a sí mismo.
 */
export function writeStoredUser(current: StoredSession, user: AuthUser): StoredSession {
    const stored: StoredSession = { ...current, user }

    try {
        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ user: stored.user, expiresAt: stored.expiresAt } satisfies StoredPayload),
        )
    } catch {
        /* Como en `writeStoredSession`: si no se puede escribir, la sesión
           sigue en memoria hasta la próxima recarga. */
    }

    return stored
}
