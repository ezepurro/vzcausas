/**
 * Base de datos en memoria del mock.
 *
 * Se arma copiando las semillas de `fixtures.ts`, así el servidor falso puede
 * crear, editar y borrar sin ensuciar las constantes. Dura lo que dura la
 * pestaña: un F5 vuelve al estado inicial, igual que `resetMockDb()`.
 */

import type { Lawyer, ProceduralState, User } from './contract';
import {
    CREDENTIALS,
    DEFAULT_PASSWORD,
    LAWYERS,
    PROCEDURAL_STATES,
    TOKEN_PREFIX,
    USERS,
    USER_LAWYER,
} from './fixtures';

export interface MockDb {
    users: User[];
    lawyers: Lawyer[];
    proceduralStates: ProceduralState[];
    /** `userId` → `lawyerId`. Ver la nota de `USER_LAWYER`. */
    userLawyer: Map<number, number>;
    /** `username` → contraseña en texto plano. Es un mock, no un backend. */
    passwords: Map<string, string>;
    /** Tokens vivos: `accessToken` → `userId`. El logout borra la entrada. */
    sessions: Map<string, number>;
    nextUserId: number;
    nextLawyerId: number;
    nextProceduralStateId: number;
    /** Sufijo incremental para que dos logins no devuelvan el mismo token. */
    issuedTokens: number;
}

function initialState(): MockDb {
    const users = USERS.map((u) => ({ ...u, role: [...u.role] }));
    const passwords = new Map<string, string>();
    for (const user of users) {
        passwords.set(user.username, CREDENTIALS[user.username] ?? DEFAULT_PASSWORD);
    }
    

    return {
        users,
        lawyers: LAWYERS.map((l) => ({ ...l })),
        proceduralStates: PROCEDURAL_STATES.map((s) => ({ ...s })),
        userLawyer: new Map(Object.entries(USER_LAWYER).map(([k, v]) => [Number(k), v])),
        passwords,
        sessions: new Map(),
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
 * Pensado para el `beforeEach` de un test o para el botón "reiniciar datos"
 * de una pantalla de desarrollo. Muta la instancia en vez de reemplazarla
 * para que quien ya importó `db` siga viendo lo mismo.
 */
export function resetMockDb(): void {
    Object.assign(db, initialState());
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

/** Usuario dueño de un token vivo, o `undefined` si el token no sirve. */
export function userFromToken(token: string | undefined): User | undefined {
    if (!token) return undefined;
    const userId = db.sessions.get(token);
    if (userId === undefined) return undefined;
    return db.users.find((u) => u.id === userId);
}

/** Cierra una sesión. Devuelve `false` si el token ya no existía. */
export function revokeToken(token: string): boolean {
    return db.sessions.delete(token);
}
