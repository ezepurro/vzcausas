/**
 * Tipos del contrato de API.
 *
 * Fuente: `docs/Api-Contract/API_CONTRACT_V3.md`, con la revisión del
 * 01/10/2026 (§7.7). Este archivo es la traducción literal del documento a
 * TypeScript.
 *
 * Los **mensajes** quedan en castellano porque son los que define el
 * contrato y los que ve el usuario; lo que está en inglés es el código.
 *
 * El contrato anterior tenía seis divergencias (roles con dos vocabularios y
 * dos formas, `abogadoId` en castellano, el 401 del login con otro
 * envoltorio, el plazo como string). **Ya no existen**: el contrato vigente
 * las resolvió y este archivo no tiene que replicar ninguna.
 */

/** Base URL del contrato (§4). El mock acepta pedidos con o sin este prefijo. */
export const BASE_PATH = '/api/v1';

/* ------------------------------------------------------------------ */
/* Enumerados (§2)                                                     */
/* ------------------------------------------------------------------ */

/**
 * Roles del usuario. Un usuario puede tener más de uno.
 *
 * El rótulo que ve la persona lo resuelve el cliente: `ADMINISTRATOR` se
 * muestra como "Administrador".
 */
export const ROLES = ['ADMINISTRATOR', 'LAWYER', 'SECRETARY'] as const;
export type Role = (typeof ROLES)[number];

/**
 * Orden de precedencia para cuando la interfaz muestra un rol solo.
 * Gana el de más peso.
 */
export const ROLE_PRECEDENCE: readonly Role[] = ['ADMINISTRATOR', 'SECRETARY', 'LAWYER'];

/** Fueros con los que trabaja el estudio. */
export const JURISDICTIONS = ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

/**
 * Cómo se cuentan los días de un plazo.
 *
 * `NONE` es para los estados que no abren plazo (`timeLimitDays: 0`). El
 * contrato anterior no tenía cómo expresarlo y obligaba a guardar "0 días
 * hábiles", que no es lo mismo: eso vence hoy, "sin plazo" no vence nunca.
 */
export const DAY_TYPES = ['BUSINESS', 'CONSECUTIVE', 'NONE'] as const;
export type DayType = (typeof DAY_TYPES)[number];

/**
 * Posición que ocupa el cliente en la causa (§2). No es el `Role` de
 * seguridad del usuario.
 */
export const PROCEDURAL_ROLES = [
    'DEFENSE',
    'PRIVATE_PROSECUTOR',
    'APPELLANT',
    'PLAINTIFF',
    'DEFENDANT',
] as const;
export type ProceduralRole = (typeof PROCEDURAL_ROLES)[number];

/** Qué roles admite cada fuero. Uno que no corresponde es un `400`. */
export const PROCEDURAL_ROLES_BY_JURISDICTION: Record<Jurisdiction, readonly ProceduralRole[]> = {
    CRIMINAL: ['DEFENSE', 'PRIVATE_PROSECUTOR'],
    ADMINISTRATIVE: ['DEFENSE', 'APPELLANT'],
    AMPARO: ['PLAINTIFF', 'DEFENDANT'],
};

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
/* Recursos (§3)                                                       */
/* ------------------------------------------------------------------ */

/**
 * La ficha profesional embebida dentro de un usuario (§3.2).
 *
 * Son los tres campos que la pantalla necesita para dibujar la columna
 * "Abogado vinculado": el id para operar, el nombre para mostrar y la
 * matrícula porque desambigua dos homónimos. No es la ficha completa.
 */
export interface EmbeddedLawyer {
    id: number;
    fullName: string;
    registrationNumber: string;
}

/** Usuario tal como lo devuelve `/users` y el login (§3.2). */
export interface User {
    id: number;
    username: string;
    fullName: string;
    email: string;
    /** Siempre arreglo, también en el login. Al menos un rol. */
    roles: Role[];
    /** `null` para un usuario sin ficha profesional (secretaría). */
    lawyer: EmbeddedLawyer | null;
    /** ISO 8601 con offset. `null` si nunca inició sesión. */
    lastLoginAt: string | null;
    /** Estado de alta. La baja es lógica. */
    active: boolean;
}

/** Abogado tal como lo devuelve `/lawyers` (§3.3). */
export interface Lawyer {
    id: number;
    /** Incluye el tratamiento: "Dr. Ignacio Peralta". */
    fullName: string;
    /** Matrícula del Colegio de Abogados de Córdoba, formato `1-28114`. */
    registrationNumber: string;
    /** Causas activas donde es responsable. Calculado, sólo lectura. */
    activeCases: number;
    active: boolean;
}

/** Estado procesal tal como lo devuelve `/procedural-states` (§3.4). */
export interface ProceduralState {
    id: number;
    /** Texto libre en castellano: lo carga el estudio (RN4). Único por fuero. */
    name: string;
    jurisdiction: Jurisdiction;
    /** Lugar en el ciclo de vida del fuero, desde 1. Único por fuero. */
    position: number;
    /** Días que abre el estado. `0` = no abre plazo. */
    timeLimitDays: number;
    dayType: DayType;
    /** Cierra el ciclo de vida de la causa (Archivada, Prescripta). */
    terminal: boolean;
    /** Causas que están hoy en este estado. Calculado, sólo lectura. */
    activeCases: number;
    active: boolean;
}

/** Calificación legal tal como la devuelve `/legal-qualifications` (§3.5). */
export interface LegalQualification {
    id: number;
    /** Denominación con la norma: `Hurto simple — art. 162 CP`. Única entre las vigentes. */
    name: string;
    /** Plazo de prescripción de la acción, en meses enteros. */
    prescriptionMonths: number;
    /** Causas activas que la registran. Calculado, sólo lectura. */
    activeCases: number;
    active: boolean;
}

/** Cliente tal como lo devuelve `/clients` (§3.6). */
export interface Client {
    id: number;
    lastName: string;
    firstName: string;
    /** Sólo dígitos, sin puntos. Único entre los vigentes. */
    dni: string;
    phone: string | null;
    email: string | null;
    /** Fecha de alta en el estudio, `YYYY-MM-DD`. La asigna el backend. */
    clientSince: string;
    /** Causas activas en las que es cliente. Calculado, sólo lectura. */
    activeCases: number;
    active: boolean;
}

/** El cliente embebido en una causa: sin `activeCases` ni `active` (§3.7). */
export type CaseClient = Omit<Client, 'activeCases' | 'active'>;

/** Una calificación de la causa, con su fecha del hecho y su prescripción (§3.7). */
export interface CaseLegalQualification {
    id: number;
    name: string;
    prescriptionMonths: number;
    /** Fecha del hecho imputado. La carga el usuario. */
    offenseDate: string;
    /** Desde cuándo se computa. Hoy es igual a `offenseDate` (D-19). */
    prescriptionStartsOn: string;
    /** `prescriptionStartsOn` más `prescriptionMonths`. */
    prescriptionExpiresOn: string;
}

/** Estado procesal de una causa, o el resultante de un acto (§3.7). */
export interface CaseState {
    /** `null` si el estado fue escrito a mano. */
    proceduralStateId: number | null;
    name: string;
    /** `true` si es un estado escrito a mano para esta causa. */
    custom: boolean;
}

/** El plazo abierto de una causa (§3.7). */
export interface NextDeadline {
    proceduralActId: number;
    dueDate: string;
    /** `0` vence hoy; negativo, ya vencido. */
    businessDaysRemaining: number;
    manuallyAdjusted: boolean;
}

/** Causa tal como la devuelve `/cases` (§3.7). */
export interface Case {
    id: number;
    /** 8 dígitos. Identifica la causa (RN2). */
    sacNumber: string;
    caption: string;
    court: string | null;
    jurisdiction: Jurisdiction;
    proceduralRole: ProceduralRole;
    instructorName: string | null;
    instructorPhone: string | null;
    /** `null` en el fuero penal. */
    counterparty: string | null;
    /** Objeto del reclamo o del amparo. `null` en el fuero penal. */
    subjectMatter: string | null;
    client: CaseClient;
    responsibleLawyer: EmbeddedLawyer;
    /** Al menos una en el penal; vacío en los demás fueros. */
    legalQualifications: CaseLegalQualification[];
    startDate: string;
    /** `null` mientras la causa no tenga actos procesales (D-09). */
    currentState: CaseState | null;
    /** `null` si la causa no tiene plazo abierto. */
    nextDeadline: NextDeadline | null;
    active: boolean;
}

/** El plazo que abre un acto. Los valores de la tabla se copian al registrarlo (§3.8). */
export interface ActDeadline {
    timeLimitDays: number;
    dayType: DayType;
    /** `notificationDate` en el fuero administrativo, `actDate` en los demás. */
    countsFrom: string;
    /** Lo que da la tabla. `null` si el estado no abre plazo. */
    computedDueDate: string | null;
    /** El vigente: el calculado o, si se ajustó, el manual. */
    dueDate: string;
    manuallyAdjusted: boolean;
}

/** Acto procesal tal como lo devuelve su registro (§3.8). */
export interface ProceduralAct {
    id: number;
    caseId: number;
    resultingState: CaseState;
    actDate: string;
    /** Sólo en el fuero administrativo (RN6). */
    notificationDate: string | null;
    notes: string | null;
    /** `null` si el acto no abre plazo. */
    deadline: ActDeadline | null;
    registeredBy: { id: number; fullName: string };
    registeredAt: string;
}

/** Respuesta de `GET /cases/{caseId}/procedural-acts/deadline-preview` (§3.8). */
export interface DeadlinePreview {
    proceduralStateId: number;
    timeLimitDays: number;
    dayType: DayType;
    countsFrom: string;
    /** `null` si el estado no abre plazo. */
    dueDate: string | null;
    /** `null` si el estado no abre plazo. */
    businessDaysRemaining: number | null;
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

/**
 * Alta de usuario (§3.2).
 *
 * `lawyerId` y `lawyer` son **mutuamente excluyentes**: se manda uno de los
 * dos, nunca los dos. Cuando viene `lawyer`, el abogado y el usuario se crean
 * en una sola transacción — si algo falla, no queda ninguno.
 */
export interface CreateUserRequest {
    username: string;
    fullName: string;
    email: string;
    password: string;
    roles: Role[];
    /** Vincular un abogado ya registrado. */
    lawyerId?: number;
    /** Registrar un abogado nuevo junto con el usuario. */
    lawyer?: CreateLawyerRequest;
}

/**
 * Edición de usuario. Todos los campos son opcionales, pero hay que mandar
 * al menos uno: un PATCH vacío responde 400.
 *
 * `roles` **reemplaza el conjunto completo**. Para conservar los roles que
 * ya tiene, se omite el campo.
 *
 * `lawyerId: null` desvincula la ficha profesional.
 */
export interface UpdateUserRequest {
    username?: string;
    fullName?: string;
    email?: string;
    roles?: Role[];
    lawyerId?: number | null;
}

/** Alta de abogado (§3.3). Dos campos y nada más. */
export interface CreateLawyerRequest {
    fullName: string;
    registrationNumber: string;
}

/** Edición de abogado. Al menos un campo. `activeCases` no es modificable. */
export interface UpdateLawyerRequest {
    fullName?: string;
    registrationNumber?: string;
}

/** Alta de estado procesal (§3.4). */
export interface CreateProceduralStateRequest {
    name: string;
    jurisdiction: Jurisdiction;
    /** Por defecto, al final del ciclo. Insertar en el medio renumera. */
    position?: number;
    timeLimitDays?: number;
    dayType?: DayType;
    terminal?: boolean;
}

/**
 * Edición de estado procesal. Al menos un campo.
 *
 * `jurisdiction` traslada el estado a otro fuero, y sólo procede si ninguna
 * causa lo registra (V3 D-07): si no, `422 PROCEDURAL_STATE_IN_USE`.
 */
export interface UpdateProceduralStateRequest {
    name?: string;
    jurisdiction?: Jurisdiction;
    position?: number;
    timeLimitDays?: number;
    dayType?: DayType;
    terminal?: boolean;
}

/** Alta de calificación legal (§3.5). */
export interface CreateLegalQualificationRequest {
    name: string;
    prescriptionMonths: number;
}

/** Edición de calificación legal. Al menos un campo. */
export type UpdateLegalQualificationRequest = Partial<CreateLegalQualificationRequest>;

/** Alta de cliente (§3.6). Teléfono y correo son opcionales. */
export interface CreateClientRequest {
    lastName: string;
    firstName: string;
    dni: string;
    phone?: string;
    email?: string;
}

/** Una calificación en el alta de causa: cuál y cuándo fue el hecho (D-28). */
export interface CaseQualificationRequest {
    legalQualificationId: number;
    offenseDate: string;
}

/**
 * Alta de causa (§3.7).
 *
 * `legalQualifications` va sólo en el fuero penal; `counterparty` y
 * `subjectMatter`, sólo en los otros dos. Mandar cualquiera donde no
 * corresponde es un `400`.
 */
export interface CreateCaseRequest {
    sacNumber: string;
    jurisdiction: Jurisdiction;
    caption: string;
    court?: string;
    instructorName?: string;
    instructorPhone?: string;
    clientId: number;
    proceduralRole: ProceduralRole;
    legalQualifications?: CaseQualificationRequest[];
    counterparty?: string;
    subjectMatter?: string;
    responsibleLawyerId: number;
    /** Por defecto, hoy. */
    startDate?: string;
}

/**
 * Registro de un acto procesal (§3.8). `proceduralStateId` y `customState`
 * son excluyentes: va uno de los dos.
 */
export interface CreateProceduralActRequest {
    proceduralStateId?: number;
    customState?: string;
    actDate: string;
    notificationDate?: string;
    manualDueDate?: string;
    notes?: string;
}

/* ------------------------------------------------------------------ */
/* Parámetros de consulta                                              */
/* ------------------------------------------------------------------ */

/** Valores por defecto y límites de paginación (§3). */
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

export type LawyersQuery = PaginatedQuery;

export interface ProceduralStatesQuery extends PaginatedQuery {
    jurisdiction?: Jurisdiction;
}

export type LegalQualificationsQuery = PaginatedQuery;

export type ClientsQuery = PaginatedQuery;

/**
 * Filtros de `GET /cases` (§3.7). `proceduralStateId`, `customState` y
 * `withoutProceduralActs` son excluyentes entre sí.
 */
export interface CasesQuery extends PaginatedQuery {
    jurisdiction?: Jurisdiction;
    responsibleLawyerId?: number;
    proceduralStateId?: number;
    customState?: string;
    withoutProceduralActs?: boolean;
    clientId?: number;
    openDeadline?: boolean;
}

export interface DeadlinePreviewQuery {
    proceduralStateId: number;
    actDate: string;
    notificationDate?: string;
}

/* ------------------------------------------------------------------ */
/* Envoltorios de respuesta (§5.1)                                     */
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
    /**
     * El usuario completo, con la misma forma que devuelve `/users`.
     *
     * Su `lastLoginAt` es el acceso **anterior** a este, no el de ahora: es
     * lo que le sirve a la persona para detectar un ingreso que no hizo.
     */
    user: User;
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

/** El rol de más peso de un usuario, o `null` si viene sin roles. */
export function principalRole(roles: Role[]): Role | null {
    return ROLE_PRECEDENCE.find((role) => roles.includes(role)) ?? null;
}

/* ------------------------------------------------------------------ */
/* Renovación del token                                                */
/* ------------------------------------------------------------------ */

/**
 * Lo que viaja adentro del token de acceso.
 *
 * Ojo: **no es el mismo objeto que el `user` del login**, aunque el backend
 * lo devuelva con ese nombre. El abogado es un id suelto, aparecen los
 * permisos y faltan el nombre completo, el correo, el último acceso y el
 * estado de alta. Los roles sí se llaman `roles`, igual que en el login.
 */
export interface SessionPrincipal {
    id: number;
    username: string;
    roles: Role[];
    lawyerId: number | null;
    permissions: string[];
}

/** Respuesta de `POST /auth/refresh`. Todavía no está en el contrato. */
export interface RefreshedSession {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    user: SessionPrincipal;
}

/**
 * Permisos por rol.
 *
 * Es una aproximación del mock: el contrato no publica el catálogo de
 * permisos y ninguna pantalla los usa todavía. Están para que la forma de la
 * respuesta sea la correcta, no para decidir nada.
 */
const PERMISSIONS_BY_ROLE: Record<Role, string[]> = {
    ADMINISTRATOR: [
        'user:manage',
        'lawyer:manage',
        'procedural-state:manage',
        'legal-qualification:manage',
        'case:read',
    ],
    LAWYER: ['case:read', 'case:change-status'],
    SECRETARY: ['case:read', 'client:manage'],
};

/** Los permisos de un usuario, sin repetidos y en orden estable. */
export function permissionsFor(roles: Role[]): string[] {
    const all = roles.flatMap((role) => PERMISSIONS_BY_ROLE[role] ?? []);
    return [...new Set(all)].sort();
}
