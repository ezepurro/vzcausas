/**
 * Tipos del contrato de API v1.
 *
 * Fuente: `docs/api contract v1.md`. Este archivo es la traducción literal
 * del documento a TypeScript.
 *
 * Los **mensajes** quedan en castellano porque son los que define el
 * contrato y los que ve el usuario; lo que está en inglés es el código.
 *
 * Las divergencias del documento (roles en dos vocabularios, `abogadoId`
 * como string, el 401 del login con otra forma) se replican tal cual en vez
 * de "arreglarse": un mock que corrige el contrato deja de servir para
 * detectar el problema cuando aparezca el backend real. Todas están
 * marcadas con un comentario DIVERGENCIA y listadas en el README.
 */

/** Base URL del contrato (§3). El mock acepta pedidos con o sin este prefijo. */
export const BASE_PATH = '/api/v1';

/* ------------------------------------------------------------------ */
/* Enumerados                                                          */
/* ------------------------------------------------------------------ */

/**
 * Roles tal como aparecen en los payloads de `/users`.
 *
 * DIVERGENCIA: el contrato escribe `ADMINISTATOR` (sin la "R") en todos los
 * ejemplos de `/users`, pero `ADMINISTRADOR` en la tabla de endpoints y en la
 * respuesta del login. Se respeta la grafía de los payloads porque es la que
 * un cliente tendría que comparar. Si el backend define otra, se cambia acá
 * y el resto del mock sigue funcionando.
 */
export const ROLES = ['ADMINISTATOR', 'LAWYER', 'SECRETARIAT'] as const;
export type Role = (typeof ROLES)[number];

/**
 * Rol que devuelve el login dentro de `data.user`.
 *
 * DIVERGENCIA: en el login el rol es un string suelto y en castellano
 * (`"role": "ADMINISTRADOR"`), mientras que en `/users` es un arreglo en
 * inglés. Son dos formas distintas del mismo dato.
 */
export const SESSION_ROLES = ['ADMINISTRADOR', 'LAWYER', 'SECRETARIAT'] as const;
export type SessionRole = (typeof SESSION_ROLES)[number];

/**
 * Traduce los roles del recurso usuario al rol único que espera el login.
 *
 * Existe sólo por la DIVERGENCIA de arriba: el contrato maneja el mismo dato
 * con dos vocabularios y dos formas. Gana el rol de mayor privilegio.
 */
export function sessionRoleFrom(roles: Role[]): SessionRole {
    if (roles.includes('ADMINISTATOR')) return 'ADMINISTRADOR';
    if (roles.includes('LAWYER')) return 'LAWYER';
    return 'SECRETARIAT';
}

/**
 * Fueros de los estados procesales.
 *
 * El contrato sólo nombra `ADMINISTRATIVE` y `CRIMINAL`. `AMPARO` lo agrega
 * este equipo: es el tercer fuero con el que trabaja el estudio —ver el
 * prototipo y `docs/TRADUCCION_DOMINIO.md`, donde `Amparo` figura como
 * término que no se traduce— y sin él no entra la mitad del ciclo de vida
 * real.
 *
 * Antes había cuatro fueros más (CIVIL, COMMERCIAL, LABOR, FAMILY) que el
 * mock había inventado para que el filtro tuviera algo que filtrar. Se
 * sacaron: inventaban dominio que el estudio no usa.
 *
 * PROPUESTA: hay que confirmar la lista con el backend.
 */
export const JURISDICTIONS = ['ADMINISTRATIVE', 'CRIMINAL', 'AMPARO'] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

/** Cómo se cuentan los días de un plazo procesal. */
export const DAY_TYPES = ['BUSINESS', 'CONSECUTIVE'] as const;
export type DayType = (typeof DAY_TYPES)[number];

/**
 * Los códigos y las formas de error viven en `api/contract.ts`, que es
 * contrato de producción: lo usa `http.ts` para parsear. Se reexportan acá
 * para que el mock siga teniendo todo el contrato a mano.
 */
import type { ErrorBody, ErrorCode } from '../api/contract';

export {
    isErrorCode,
    ERROR_CODES,
    type ErrorBody,
    type ErrorCode,
    type LoginErrorBody,
} from '../api/contract';

/* ------------------------------------------------------------------ */
/* Recursos                                                            */
/* ------------------------------------------------------------------ */

/** Usuario tal como lo devuelve `/users` (§2.2). */
export interface User {
    id: number;
    username: string;
    /** Siempre arreglo en `/users`, aunque el login lo mande como string. */
    role: Role[];
}

/** Usuario embebido en la respuesta del login (§2.1). */
export interface SessionUser {
    id: number;
    username: string;
    role: SessionRole;
}

/** Abogado tal como lo devuelve `POST /lawyers` (§2.3). */
export interface Lawyer {
    id: number;
    firstName: string;
    lastName: string;
    /** Matrícula profesional, formato `MP-12345`. */
    registrationNumber: string;
    email: string;
    phone: string;
}

/** Estado procesal tal como lo devuelve `GET /procedural-states` (§2.4). */
export interface ProceduralState {
    id: number;
    name: string;
    jurisdiction: Jurisdiction;
    /** DIVERGENCIA: el contrato lo manda como string (`"10"`), no como número. */
    proceduralTimeLimit: string;
    dayType: DayType;
}

/* ------------------------------------------------------------------ */
/* Cuerpos de petición                                                 */
/* ------------------------------------------------------------------ */

export interface LoginRequest {
    username: string;
    password: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface CreateUserRequest {
    username: string;
    password: string;
    role: Role[];
    /**
     * DIVERGENCIA: único campo en castellano del contrato, y llega como
     * string (`"abogadoId": "1"`) aunque los ids sean enteros. El mock acepta
     * las dos formas. El nombre se deja tal cual porque es lo que viaja por
     * la red: renombrarlo rompería el pedido contra el backend real.
     */
    abogadoId?: string | number;
}

/**
 * Todos los campos son opcionales, pero hay que mandar al menos uno.
 *
 * DIVERGENCIA: el ejemplo del contrato manda `"role": "USUARIO"` —un string,
 * y con un valor que no aparece en ninguna otra parte del documento—. El mock
 * acepta string o arreglo y normaliza a arreglo.
 */
export interface UpdateUserRequest {
    username?: string;
    role?: Role[] | Role;
}

export interface CreateLawyerRequest {
    firstName: string;
    lastName: string;
    registrationNumber: string;
    email: string;
    phone: string;
}


/**
 * PROPUESTA: el contrato v1 no define el alta de estados procesales.
 * Ver "Endpoints que no están en el contrato" en el README de esta carpeta.
 */
export interface CreateProceduralStateRequest {
    name: string;
    jurisdiction: Jurisdiction;
    /** DIVERGENCIA 5: viaja como string (`"10"`), igual que en la respuesta. */
    proceduralTimeLimit: string;
    dayType: DayType;
}

/**
 * PROPUESTA. Todos los campos son opcionales, pero hay que mandar al menos
 * uno: un PATCH vacío responde 400, como en `/users`.
 */
export interface UpdateProceduralStateRequest {
    name?: string;
    jurisdiction?: Jurisdiction;
    proceduralTimeLimit?: string;
    dayType?: DayType;
}


/* ------------------------------------------------------------------ */
/* Parámetros de consulta                                              */
/* ------------------------------------------------------------------ */

/** Valores por defecto y límites de paginación (§2.2 y §2.4). */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 100;

export interface PaginatedQuery {
    page?: number;
    limit?: number;
    search?: string;
}

export interface UsersQuery extends PaginatedQuery {
    role?: Role;
}

export interface ProceduralStatesQuery extends PaginatedQuery {
    jurisdiction?: Jurisdiction;
}

/* ------------------------------------------------------------------ */
/* Envoltorios de respuesta (§4)                                       */
/* ------------------------------------------------------------------ */

/** POST / PATCH / GET de un recurso individual. */
export interface ItemResponse<T> {
    data: T;
}

export interface Pagination {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
}

/** GET de una colección paginada. */
export interface ListResponse<T> {
    data: T[];
    pagination: Pagination;
}

/** Sesión creada por `POST /auth/login`. */
export interface Session {
    accessToken: string;
    tokenType: 'Bearer';
    /** Segundos de vigencia del token. */
    expiresIn: number;
    user: SessionUser;
}

/* `ErrorBody` y `LoginErrorBody` se definen en `api/contract.ts` y se
   reexportan más arriba: son contrato de producción, no del mock. */

/* ------------------------------------------------------------------ */
/* Constructores de cuerpos                                            */
/* ------------------------------------------------------------------ */

export function itemBody<T>(data: T): ItemResponse<T> {
    return { data };
}

export function listBody<T>(data: T[], pagination: Pagination): ListResponse<T> {
    return { data, pagination };
}

export function errorBody(
    code: ErrorCode,
    message: string,
    details: Record<string, string> | null = null,
): ErrorBody {
    return { error: { code, message, details } };
}

/** Calcula el bloque `pagination` a partir del total y la página pedida. */
export function buildPagination(totalItems: number, page: number, limit: number): Pagination {
    return {
        page,
        limit,
        totalItems,
        // Una colección vacía tiene 0 páginas, no 1.
        totalPages: Math.ceil(totalItems / limit),
    };
}
