/**
 * Las formas de la sesión, sacadas del contrato (§3.1 `POST /auth/login`).
 *
 * Están escritas acá a partir del contrato y no copiadas de
 * `shared/mocks/contract.ts`: los mocks son sólo para desarrollo y el día que
 * se borren, esto tiene que seguir en pie. Tampoco se reusa
 * `features/users/types/user.ts`, que además de ser de otro módulo quedó
 * escrito contra el contrato viejo.
 */

/**
 * Los perfiles del sistema (§2). Van como unión de literales **y** como
 * arreglo tipado con esa unión: si mañana el contrato agrega un rol, el
 * arreglo deja de compilar hasta que alguien lo mire.
 */
export const ROLES = ['ADMINISTRATOR', 'LAWYER', 'SECRETARY'] as const
export type Role = (typeof ROLES)[number]

/** Ficha profesional embebida en el usuario. `null` si no ejerce. */
export interface AuthLawyer {
    id: number
    fullName: string
    registrationNumber: string
}

/**
 * El usuario que devuelve el login. Tiene la misma forma que el recurso de
 * `/users`, pero se declara acá porque es lo que llega dentro de la sesión y
 * un módulo no importa de otro.
 */
export interface AuthUser {
    id: number
    username: string
    fullName: string
    email: string
    roles: Role[]
    lawyer: AuthLawyer | null
    /**
     * El acceso **anterior**, no el que se está haciendo. El contrato lo
     * subraya: permite que la persona advierta un ingreso que no efectuó.
     * `null` si nunca entró.
     */
    lastLoginAt: string | null
    active: boolean
}

/** Lo que viene adentro de `data` en un login exitoso. */
export interface Session {
    accessToken: string
    tokenType: 'Bearer'
    /** Segundos de vida del token. El contrato manda 3600. */
    expiresIn: number
    user: AuthUser
}

/**
 * La sesión tal como sobrevive a una recarga de página.
 *
 * Se guarda el usuario entero porque el contrato no publica un
 * `GET /users/me`: sin esto, después de un F5 no habría forma de saber quién
 * está adentro. `expiresAt` es el vencimiento ya resuelto a epoch en
 * milisegundos, para no tener que recordar cuándo empezó a contar `expiresIn`.
 */
export interface StoredSession {
    accessToken: string
    user: AuthUser
    expiresAt: number
}

/* ---------------- renovación del token ---------------- */

/**
 * Los datos que el backend mete adentro del token de acceso y que devuelve
 * al renovarlo.
 *
 * **No es el mismo objeto que el `user` del login**, aunque el backend lo
 * llame igual: acá no vienen `fullName`, `email`, `lastLoginAt` ni `active`,
 * los roles se llaman `roleNames` en vez de `roles`, y el abogado es un
 * número suelto en vez de la ficha entera. Es el contenido del JWT, no el
 * recurso usuario.
 *
 * Por eso se declara aparte y con otro nombre: si se reusara `AuthUser`, una
 * renovación dejaría la sesión sin el nombre de la persona y el rail
 * quedaría en blanco.
 */
export interface SessionPrincipal {
    id: number
    username: string
    roleNames: Role[]
    lawyerId: number | null
    /** Permisos finos del usuario. Todavía no los usa ninguna pantalla. */
    permissions: string[]
}

/** Lo que devuelve `POST /auth/refresh` adentro de `data`. */
export interface RefreshedSession {
    accessToken: string
    tokenType: 'Bearer'
    expiresIn: number
    user: SessionPrincipal
}
