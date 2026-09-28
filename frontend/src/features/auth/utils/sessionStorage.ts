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
 * contenido no tiene la forma esperada, o cuando el token ya venció.
 *
 * Se descarta el token vencido en vez de intentar renovarlo acá: esta función
 * es pura y síncrona, y corre en el primer render. La renovación la maneja
 * `http.ts` cuando el servidor rechaza un pedido; si la cookie sigue viva, el
 * usuario vuelve a entrar sin escribir nada.
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

/**
 * Guarda el token renovado sobre la sesión que ya estaba abierta.
 *
 * **Conserva el usuario del login a propósito.** Lo que devuelve la
 * renovación bajo el nombre `user` es el contenido del token —id, usuario,
 * roles, permisos— y no trae el nombre completo, el correo ni la ficha
 * profesional. Pisar el usuario guardado con eso dejaría el rail sin nombre.
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

    return writeStoredSession({
        accessToken: refreshed.accessToken,
        tokenType: refreshed.tokenType,
        expiresIn: refreshed.expiresIn,
        user: { ...current.user, roles: refreshed.user.roles }
    })
}
