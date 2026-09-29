/**
 * Base de datos en memoria del mock.
 *
 * Se arma copiando las semillas de `fixtures.ts`, así el servidor falso puede
 * crear, editar y dar de baja sin ensuciar las constantes. Dura lo que dura
 * la pestaña: un F5 vuelve al estado inicial, igual que `resetMockDb()`.
 */

import type { EmbeddedLawyer, Lawyer, ProceduralState, User } from './contract';
import {
    CREDENTIALS,
    DEFAULT_PASSWORD,
    LAWYERS,
    PROCEDURAL_STATES,
    TOKEN_PREFIX,
    USERS,
    type StoredUser,
} from './fixtures';

export interface MockDb {
    /** Guardan `lawyerId`; el objeto `lawyer` se arma al serializar. */
    users: StoredUser[];
    lawyers: Lawyer[];
    proceduralStates: ProceduralState[];
    /** `username` → contraseña en texto plano. Es un mock, no un backend. */
    passwords: Map<string, string>;
    /** Tokens vivos: `accessToken` → `userId`. El logout borra la entrada. */
    sessions: Map<string, number>;
    /**
     * Tokens emitidos que ya "vencieron".
     *
     * El mock no mide el tiempo: el vencimiento se provoca a mano con
     * `expireIssuedTokens()`. El token sigue en `sessions` —la sesión no se
     * cerró, sólo caducó el acceso— y por eso todavía sirve para renovar.
     */
    expiredTokens: Set<string>;
    nextUserId: number;
    nextLawyerId: number;
    nextProceduralStateId: number;
    /** Sufijo incremental para que dos logins no devuelvan el mismo token. */
    issuedTokens: number;
}

function initialState(): MockDb {
    const users = USERS.map((u) => ({ ...u, roles: [...u.roles] }));
    const passwords = new Map<string, string>();
    for (const user of users) {
        passwords.set(user.username, CREDENTIALS[user.username] ?? DEFAULT_PASSWORD);
    }

    return {
        users,
        lawyers: LAWYERS.map((l) => ({ ...l })),
        proceduralStates: PROCEDURAL_STATES.map((s) => ({ ...s })),
        passwords,
        sessions: new Map(),
        expiredTokens: new Set(),
        nextUserId: Math.max(...USERS.map((u) => u.id)) + 1,
        nextLawyerId: Math.max(...LAWYERS.map((l) => l.id)) + 1,
        nextProceduralStateId: Math.max(...PROCEDURAL_STATES.map((s) => s.id)) + 1,
        issuedTokens: 0,
    };
}

/** Instancia única. Los handlers la leen y la escriben directo. */
export const db: MockDb = initialState();

/**
 * Vuelve la base al estado semilla.
 *
 * Pensado para el `beforeEach` de un test o para un botón "reiniciar datos"
 * de desarrollo. Muta la instancia en vez de reemplazarla para que quien ya
 * importó `db` siga viendo lo mismo.
 */
export function resetMockDb(): void {
    Object.assign(db, initialState());
}

/* ------------------------------------------------------------------ */
/* Serialización                                                       */
/* ------------------------------------------------------------------ */

/**
 * Convierte el usuario guardado en el recurso que define el contrato.
 *
 * La base guarda `lawyerId` y acá se resuelve el objeto embebido. Hacerlo al
 * serializar y no al guardar tiene una ventaja concreta: si alguien edita el
 * nombre del abogado, los usuarios vinculados lo reflejan solos, sin tener
 * que salir a actualizar copias.
 */
export function toUser(stored: StoredUser): User {
    return {
        id: stored.id,
        username: stored.username,
        fullName: stored.fullName,
        email: stored.email,
        roles: [...stored.roles],
        lawyer: embedLawyer(stored.lawyerId),
        lastLoginAt: stored.lastLoginAt,
        active: stored.active,
    };
}

/** Los tres campos del abogado que el contrato embebe dentro del usuario. */
function embedLawyer(lawyerId: number | null): EmbeddedLawyer | null {
    if (lawyerId === null) return null;
    const lawyer = db.lawyers.find((l) => l.id === lawyerId);
    if (!lawyer) return null;
    return {
        id: lawyer.id,
        fullName: lawyer.fullName,
        registrationNumber: lawyer.registrationNumber,
    };
}

/* ------------------------------------------------------------------ */
/* Sesiones                                                            */
/* ------------------------------------------------------------------ */

/** Emite un token para el usuario y lo registra como sesión activa. */
export function issueToken(userId: number): string {
    db.issuedTokens += 1;
    const token = `${TOKEN_PREFIX}.mock-${userId}-${db.issuedTokens}`;
    db.sessions.set(token, userId);
    return token;
}

/**
 * Usuario dueño de un token vivo, o `undefined` si el token no sirve.
 *
 * Un usuario dado de baja no tiene sesión válida aunque conserve el token:
 * la baja lógica le saca el acceso, no sólo lo esconde de los listados.
 */
export function userFromToken(token: string | undefined): StoredUser | undefined {
    if (!token) return undefined;
    if (db.expiredTokens.has(token)) return undefined;
    const userId = db.sessions.get(token);
    if (userId === undefined) return undefined;
    const user = db.users.find((u) => u.id === userId);
    return user?.active ? user : undefined;
}

/** Cierra una sesión. Devuelve `false` si el token ya no existía. */
export function revokeToken(token: string): boolean {
    db.expiredTokens.delete(token);
    return db.sessions.delete(token);
}

/**
 * Usuario habilitado a renovar con este token.
 *
 * A diferencia de `userFromToken`, acepta un token vencido: de eso se trata
 * renovar. Lo que no acepta es un token revocado por un logout, ni el de un
 * usuario dado de baja.
 *
 * En el backend real la credencial de la renovación es la cookie `httpOnly`,
 * no el token de acceso. El mock no puede emitir esa cookie desde un service
 * worker, así que usa el token vencido como sustituto. Es la única libertad
 * que se toma acá, y no cambia nada de lo que el frontend tiene que resolver.
 */
export function userForRenewal(token: string | undefined): StoredUser | undefined {
    if (!token) return undefined;
    const userId = db.sessions.get(token);
    if (userId === undefined) return undefined;
    const user = db.users.find((u) => u.id === userId);
    return user?.active ? user : undefined;
}

/**
 * Vence todos los tokens vivos, como si hubieran pasado los quince minutos.
 *
 * Es la forma de probar la renovación sin esperar. Desde la consola:
 *
 * ```ts
 * const { expireIssuedTokens } = await import('/src/shared/mocks/index.ts')
 * expireIssuedTokens()
 * ```
 *
 * A partir de ahí, el siguiente pedido a cualquier pantalla responde 401 y
 * el frontend tiene que renovar solo, sin que el usuario note nada.
 */
export function expireIssuedTokens(): number {
    for (const token of db.sessions.keys()) db.expiredTokens.add(token);
    return db.expiredTokens.size;
}

/** Cierra todas las sesiones abiertas de un usuario. */
export function revokeUserSessions(userId: number): void {
    for (const [token, id] of db.sessions) {
        if (id === userId) db.sessions.delete(token);
    }
}
