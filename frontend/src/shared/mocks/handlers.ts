/**
 * Servidor falso: implementa los endpoints de `API_CONTRACT_V5.md` sobre la
 * base en memoria de `db.ts`. Lo que suma V5 (Sprint 4) está en su propia
 * sección, antes de la tabla de rutas: modificar y dar de baja una causa, la
 * carátula, modificar un acto procesal, los documentos de la causa y el
 * expediente.
 *
 * Es una función pura respecto del transporte (`resolveRequest`): recibe un
 * pedido ya normalizado y devuelve `{ status, body }`. No sabe de axios ni de
 * fetch —de eso se encarga `msw-handlers.ts`—, así que también se puede
 * llamar directo desde un test.
 *
 * ## Orden de validación
 *
 * Todos los endpoints chequean en el mismo orden, y devuelven en el primer
 * error que encuentran:
 *
 * 1. `401` autenticación
 * 2. `403` rol
 * 3. `400` parámetros de ruta y de consulta
 * 4. `400` cuerpo
 * 5. `404` existencia del recurso
 * 6. `409` unicidad y dependencias
 * 7. `422` regla de negocio
 *
 * El contrato no fija ese orden; es una decisión del mock para que el
 * comportamiento sea previsible.
 *
 * La excepción son los dos endpoints de actos procesales. Ahí todo depende de
 * la causa: quién puede registrar (su abogado responsable) y qué admite el
 * cuerpo (los estados de su fuero, si el plazo corre desde la notificación).
 * Por eso el `404` de la causa va primero, después el `403` y recién después
 * el `400` del cuerpo.
 *
 * ## Quién puede qué
 *
 * Sale de la tabla de permisos por perfil del contrato (§4): leer está abierto
 * a cualquier usuario autenticado, salvo `/users`; escribir pide el rol de
 * cada recurso (`requireRole`). Un usuario con varios roles pasa si el pedido
 * está entre ellos.
 *
 * Los actos procesales no se rigen por un rol: los registra **el abogado
 * responsable de la causa** y nadie más, ni otro abogado ni el administrador
 * (V3 D-30). Se compara la ficha del usuario con el responsable de la causa
 * (`isResponsibleLawyer`).
 *
 * ## Bajas
 *
 * Los `DELETE` **no borran**: ponen `active` en `false`. Pero eso es asunto
 * del servidor: para el cliente el registro desapareció. Los listados traen
 * sólo los activos y no hay forma de pedir los dados de baja, ni de
 * reactivarlos.
 */

import {
    buildPagination,
    errorBody,
    itemBody,
    listBody,
    DAY_TYPES,
    DEFAULT_LIMIT,
    DEFAULT_PAGE,
    JURISDICTIONS,
    MAX_LIMIT,
    MIN_LIMIT,
    PROCEDURAL_ROLES_BY_JURISDICTION,
    ROLES,
    type AdministratorDashboard,
    type Case,
    type CaseDocuments,
    type CaseFilePart,
    type GeneratedCaseFile,
    type TimelineEntry,
    type DashboardCaseToAdvance,
    type DashboardDeadline,
    type DashboardPrescriptionAlert,
    type DashboardSummary,
    type DashboardTeamMember,
    type DayType,
    type DeadlinePreview,
    type DeadlineKind,
    type DocumentType,
    type Jurisdiction,
    type Lawyer,
    type LawyerDashboard,
    type ProceduralRole,
    type Role,
    permissionsFor,
    type RefreshedSession,
    type Session,
} from './contract';
import { businessDaysUntil, calendarDaysBetween, computeDueDate, isIsoDate, todayIso } from './calendar';
import {
    buildActDeadline,
    buildFolder,
    countTemplateCopies,
    currentStateIdOf,
    db,
    expectedFolderPath,
    folderPath,
    interruptiveActsOf,
    isActiveCase,
    isGoogleNative,
    isInTerminalState,
    PDF_MIME,
    SYSTEM_UPLOADER,
    templateCopies,
    toCaseDocument,
    userRef,
    type StoredDocument,
    issueToken,
    latestActOf,
    revokeToken,
    revokeUserSessions,
    templatesForNewCases,
    toCase,
    toClient,
    toDocumentTemplate,
    toFolder,
    toInterruptiveAct,
    toLawyer,
    toLegalQualification,
    actsOf,
    toProceduralAct,
    toProceduralState,
    toUser,
    userForRenewal,
    userFromToken,
    type StoredAct,
    type StoredCase,
    type StoredCaseQualification,
    type StoredFolder,
} from './db';
import {
    EXPIRES_IN,
    INITIAL_STATE_NAME,
    MAX_FILE_BYTES,
    PRESCRIBED_STATE_ID,
    PROTECTED_ADMIN_USER,
    USERS_WITH_DEPENDENCIES,
    type StoredClient,
    type StoredDocumentTemplate,
    type StoredLegalQualification,
    type StoredProceduralState,
    type StoredUser,
} from './fixtures';
import { buildPdf } from './pdf';
import {
    businessRuleViolation,
    ERRORS,
    forbiddenFor,
    NO_CONTENT,
    type MockResponse,
} from './responses';

/* ------------------------------------------------------------------ */
/* Pedido                                                              */
/* ------------------------------------------------------------------ */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Un pedido ya despegado del transporte. */
export interface MockRequest {
    method: HttpMethod;
    /** Ruta sin base URL ni query string. Ej: `/users/15`. */
    path: string;
    /** Query string ya parseada. */
    query: URLSearchParams;
    /** Cuerpo JSON ya parseado, o `undefined` si no había. */
    body?: unknown;
    /**
     * Cuerpo `multipart/form-data` ya despegado (V4: modelos formales y
     * adjuntos). `undefined` si el pedido no lo era.
     */
    form?: MockForm;
    /** Token del header `Authorization: Bearer <token>`, ya sin el prefijo. */
    token?: string;
}

/** Un archivo subido: lo que el servidor falso necesita saber de él. */
export interface UploadedFile {
    name: string;
    /** En bytes. */
    size: number;
    type: string;
}

/**
 * Un formulario `multipart/form-data`. Cada campo de texto puede repetirse
 * —`jurisdictions` viaja una vez por fuero—, así que se guardan todos.
 */
export interface MockForm {
    fields: Record<string, string[]>;
    files: Record<string, UploadedFile>;
}

interface Context {
    request: MockRequest;
    /** Parámetros de ruta capturados por el patrón. Ej: `{ userId: '15' }`. */
    params: Record<string, string>;
}

type Handler = (ctx: Context) => MockResponse;

/* ------------------------------------------------------------------ */
/* Helpers de respuesta                                                */
/* ------------------------------------------------------------------ */

function ok<T>(body: T): MockResponse<T> {
    return { status: 200, body };
}

function created<T>(body: T): MockResponse<T> {
    return { status: 201, body };
}

function fail(status: number, body: unknown, headers?: Record<string, string>): MockResponse {
    return { status, body, headers };
}

/** `400 VALIDATION_ERROR` con el detalle campo → mensaje. */
function validationError(details: Record<string, string>): MockResponse {
    return fail(400, errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', details));
}

/* ------------------------------------------------------------------ */
/* Autenticación y autorización                                        */
/* ------------------------------------------------------------------ */

type AuthResult = { ok: true; user: StoredUser } | { ok: false; response: MockResponse };

/** Sólo exige sesión válida; sirve para los endpoints de `/auth`. */
function requireSession(request: MockRequest): AuthResult {
    const user = userFromToken(request.token);
    if (!user) return { ok: false, response: fail(401, ERRORS.unauthenticatedAuth) };
    return { ok: true, user };
}

/**
 * Sólo exige sesión válida, con el `401` del resto de la API (no el de
 * `/auth`). Es la guarda de todo lo que cualquier perfil puede hacer: las
 * lecturas (RN11: todo el estudio ve todas las causas), el alta de causa y de
 * cliente, y escribir estados procesales y calificaciones legales (V3 D-39).
 */
function requireUser(request: MockRequest): AuthResult {
    const user = userFromToken(request.token);
    if (!user) return { ok: false, response: fail(401, ERRORS.unauthenticated) };
    return { ok: true, user };
}

/**
 * Exige sesión válida **y** un rol. Un usuario con varios roles pasa si el
 * pedido está entre ellos: `fvazquez` es `ADMINISTRATOR` y `LAWYER`, así que
 * administra usuarios aunque además ejerza.
 */
function requireRole(request: MockRequest, role: Role): AuthResult {
    const auth = requireUser(request);
    if (!auth.ok) return auth;
    if (!auth.user.roles.includes(role)) {
        return { ok: false, response: fail(403, forbiddenFor(role)) };
    }
    return auth;
}

/**
 * `true` si el usuario es el abogado responsable de la causa (V3 D-30): su
 * ficha (`lawyerId`) es la del responsable. No alcanza con un rol: otro
 * abogado, un administrador o alguien sin ficha no pasan.
 */
function isResponsibleLawyer(user: StoredUser, stored: StoredCase): boolean {
    return user.lawyerId !== null && user.lawyerId === stored.responsibleLawyerId;
}

/**
 * Quien opera la causa (V5 §4, "Operación de la causa", D-110): modificarla,
 * darla de baja y crear o reintentar su carpeta. El responsable, o un
 * `ADMINISTRATOR` o una `SECRETARY` sobre cualquier causa. Un usuario que
 * sólo es abogado y no es el responsable, no.
 */
function canOperateCase(user: StoredUser, stored: StoredCase): boolean {
    return isResponsibleLawyer(user, stored)
        || user.roles.includes('ADMINISTRATOR')
        || user.roles.includes('SECRETARY');
}

/** "Marcar prescripta" (D-110): el responsable o un `ADMINISTRATOR`. */
function canDeclarePrescription(user: StoredUser, stored: StoredCase): boolean {
    return isResponsibleLawyer(user, stored) || user.roles.includes('ADMINISTRATOR');
}

/** La administración: usuarios, y escribir abogados (V3 D-39). */
function requireAdmin(request: MockRequest): AuthResult {
    return requireRole(request, 'ADMINISTRATOR');
}

/**
 * "`ADMINISTRATOR` o `LAWYER`": alcanza con uno de los dos (V4 §4). Es la
 * guarda de los modelos formales, la configuración de avisos y la marca de
 * prescripción; la Secretaría recibe `403`.
 */
function requireAdministratorOrLawyer(request: MockRequest): AuthResult {
    const auth = requireUser(request);
    if (!auth.ok) return auth;
    if (!auth.user.roles.some((role) => role === 'ADMINISTRATOR' || role === 'LAWYER')) {
        return { ok: false, response: fail(403, ERRORS.forbiddenAdministratorOrLawyer) };
    }
    return auth;
}

/* ------------------------------------------------------------------ */
/* Validación                                                          */
/* ------------------------------------------------------------------ */

/** `username`: 3 a 30 caracteres, letras, números, punto, guión y guión bajo. */
const RE_USERNAME = /^[a-z0-9._-]{3,30}$/i;

/**
 * Matrícula del Colegio de Abogados de Córdoba: circunscripción (uno o dos
 * dígitos), guión y cinco dígitos. Ej: `1-28114`.
 *
 * El contrato deja anotado que hay que confirmar con el estudio si la
 * circunscripción puede tener dos dígitos: se acepta, porque una expresión
 * de más rechaza matrículas legítimas y eso es peor que una de menos.
 */
const RE_REGISTRATION = /^\d{1,2}-\d{5}$/;

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Largo máximo del apellido y de los nombres de una persona (V4 D-68). */
const PERSON_NAME_MAX = 100;

/**
 * El apellido y los nombres de un usuario o un abogado (V4 D-68), con las
 * mismas reglas que el cliente. `prefix` es para el abogado que viaja adentro
 * del alta de usuario: sus errores van en `lawyer.lastName`. En un `PATCH`
 * (`partial`) sólo se revisa lo que vino.
 */
function readPersonName(
    body: Record<string, unknown>,
    details: Record<string, string>,
    options: { prefix?: string; partial?: boolean } = {},
): { lastName: string; firstName: string; hasLastName: boolean; hasFirstName: boolean } {
    const prefix = options.prefix ?? '';
    const hasLastName = body.lastName !== undefined;
    const hasFirstName = body.firstName !== undefined;
    const lastName = asText(body.lastName);
    const firstName = asText(body.firstName);

    if (!options.partial || hasLastName) {
        if (lastName === '') details[`${prefix}lastName`] = 'El apellido es obligatorio.';
        else if (lastName.length > PERSON_NAME_MAX) details[`${prefix}lastName`] = `Puede tener hasta ${PERSON_NAME_MAX} caracteres.`;
    }
    if (!options.partial || hasFirstName) {
        if (firstName === '') details[`${prefix}firstName`] = 'Los nombres son obligatorios.';
        else if (firstName.length > PERSON_NAME_MAX) details[`${prefix}firstName`] = `Puede tener hasta ${PERSON_NAME_MAX} caracteres.`;
    }
    return { lastName, firstName, hasLastName, hasFirstName };
}

/** El usuario o el abogado buscado por apellido o nombres, en cualquier orden. */
function matchesPerson(person: { lastName: string; firstName: string }, search: string): boolean {
    return (
        contains(`${person.lastName}, ${person.firstName}`, search) ||
        contains(`${person.firstName} ${person.lastName}`, search)
    );
}

/** Requisito del contrato: 8 caracteres o más, con al menos un número. */
function isValidPassword(value: string): boolean {
    return value.length >= 8 && /\d/.test(value);
}

function asObject(body: unknown): Record<string, unknown> {
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

function asText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isRole(value: unknown): value is Role {
    return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

function isJurisdiction(value: unknown): value is Jurisdiction {
    return typeof value === 'string' && (JURISDICTIONS as readonly string[]).includes(value);
}

function isDayType(value: unknown): value is DayType {
    return typeof value === 'string' && (DAY_TYPES as readonly string[]).includes(value);
}

/** Largo del nombre de un estado procesal. Lo escribe una persona (RN4). */
const NAME_MIN = 3;
const NAME_MAX = 80;

function isValidStateName(value: string): boolean {
    return value.length >= NAME_MIN && value.length <= NAME_MAX;
}

/** Entero no negativo. `undefined` si no lo es. */
function readCount(value: unknown, max: number): number | undefined {
    const n = typeof value === 'number' ? value : Number(asText(value));
    if (!Number.isInteger(n) || n < 0 || n > max) return undefined;
    return n;
}

/** Los roles del cuerpo. `undefined` si hay alguno inválido o si está vacío. */
function normalizeRoles(value: unknown): Role[] | undefined {
    if (!Array.isArray(value) || value.length === 0) return undefined;
    if (!value.every(isRole)) return undefined;
    // Sin repetidos: ["LAWYER","LAWYER"] no tiene sentido como rol.
    return [...new Set(value)];
}

/**
 * Un usuario con estos roles necesita ficha profesional.
 *
 * Sólo `LAWYER`: la ficha es de quien ejerce. Un administrador que no lleva
 * causas —un gerente de oficina, alguien de sistemas— no tiene matrícula, y
 * exigírsela obligaba a inventarle una.
 */
function needsLawyer(roles: Role[]): boolean {
    return roles.includes('LAWYER');
}

/* ------------------------------------------------------------------ */
/* Paginación y filtros                                                */
/* ------------------------------------------------------------------ */

type PageParams = { ok: true; page: number; limit: number } | { ok: false; response: MockResponse };

/**
 * Lee `page` y `limit` de la query.
 *
 * A diferencia del ejemplo del contrato —que muestra siempre los dos
 * mensajes— el mock devuelve en `details` sólo los parámetros que están mal.
 */
function readPagination(query: URLSearchParams): PageParams {
    const details: Record<string, string> = {};

    const page = readInteger(query.get('page'), DEFAULT_PAGE);
    if (page === undefined || page < 1) {
        details.page = 'Debe ser un número entero mayor o igual a 1.';
    }

    const limit = readInteger(query.get('limit'), DEFAULT_LIMIT);
    if (limit === undefined || limit < MIN_LIMIT || limit > MAX_LIMIT) {
        details.limit = `Debe ser un número entero entre ${MIN_LIMIT} y ${MAX_LIMIT}.`;
    }

    if (Object.keys(details).length > 0) {
        return {
            ok: false,
            response: fail(
                400,
                errorBody('INVALID_PAGINATION', 'Los parámetros de paginación no son válidos.', details),
            ),
        };
    }

    return { ok: true, page: page as number, limit: limit as number };
}

/** Entero de la query. `undefined` = venía algo que no es entero. */
function readInteger(value: string | null, fallbackValue: number): number | undefined {
    if (value === null || value.trim() === '') return fallbackValue;
    if (!/^-?\d+$/.test(value.trim())) return undefined;
    return Number(value);
}

/** Corta la página pedida y arma el envoltorio `{ data, pagination }`. */
function paginate<T>(items: T[], page: number, limit: number) {
    const from = (page - 1) * limit;
    return listBody(items.slice(from, from + limit), buildPagination(items.length, page, limit));
}

/** Coincidencia laxa: sin distinguir mayúsculas ni acentos. */
function contains(haystack: string, needle: string): boolean {
    const normalize = (v: string) => v.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    return normalize(haystack).includes(normalize(needle));
}

/** Momento actual en ISO 8601 con el offset de Córdoba, como pide el contrato. */
function nowIso(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    return (
        `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
        `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}-03:00`
    );
}

/* ------------------------------------------------------------------ */
/* /auth                                                               */
/* ------------------------------------------------------------------ */

/** Fallos consecutivos que bloquean la cuenta (V3 §4, Límite de frecuencia). */
const LOGIN_LOCKOUT_THRESHOLD = 5;
/**
 * El mock no mide tiempo real —no hay escalera creciente como en el
 * backend—, así que siempre ofrece el primer escalón documentado.
 */
const LOGIN_LOCKOUT_RETRY_AFTER_SECONDS = 90;

const login: Handler = ({ request }) => {
    const body = asObject(request.body);
    const username = asText(body.username);
    const password = typeof body.password === 'string' ? body.password : '';

    const details: Record<string, string> = {};
    if (username === '') details.username = 'El nombre de usuario es obligatorio.';
    if (password === '') details.password = 'La contraseña es obligatoria.';
    if (Object.keys(details).length > 0) return validationError(details);

    /* Cuenta igual contra un usuario que no existe (D-41/D-18): si sólo se
       bloquearan cuentas reales, que el bloqueo aparezca o no delataría
       cuáles son. La clave es el string tal cual se mandó, antes de buscarlo. */
    const attempts = db.loginAttempts.get(username) ?? 0;
    if (attempts >= LOGIN_LOCKOUT_THRESHOLD) {
        return fail(429, ERRORS.tooManyLoginAttempts, {
            'Retry-After': String(LOGIN_LOCKOUT_RETRY_AFTER_SECONDS),
        });
    }

    const user = db.users.find((u) => u.username === username);
    // Un usuario dado de baja no entra, y no se distingue de credenciales
    // incorrectas: decirle "existís pero estás inactivo" filtra información.
    if (!user || !user.active || db.passwords.get(user.username) !== password) {
        db.loginAttempts.set(username, attempts + 1);
        return fail(401, ERRORS.invalidCredentials);
    }

    // Credenciales correctas: el contador de esta cuenta se borra.
    db.loginAttempts.delete(username);

    /* El contrato pide que `lastLoginAt` sea el acceso ANTERIOR, no este: es
       lo que le permite a la persona detectar un ingreso que no hizo. Se lee
       antes de pisarlo y se devuelve el valor viejo. */
    const previousLogin = user.lastLoginAt;
    user.lastLoginAt = nowIso();

    const session: Session = {
        accessToken: issueToken(user.id),
        tokenType: 'Bearer',
        expiresIn: EXPIRES_IN,
        user: { ...toUser(user), lastLoginAt: previousLogin },
    };
    return ok(itemBody(session));
};

/**
 * Renovación del token de acceso.
 *
 * **No está en el contrato**: lo está implementando el equipo de backend y la
 * forma de la respuesta la confirmaron ellos. Cuando se publique, revisar que
 * coincida.
 *
 * Dos cosas para tener presentes, porque el frontend depende de las dos:
 *
 * 1. **El token de acceso rota.** El viejo deja de servir en el acto. Si
 *    llegaran dos renovaciones en paralelo con el mismo token, la segunda
 *    encontraría un token revocado; el backend real, además, da por robada la
 *    sesión y la cierra entera.
 * 2. **El `user` de la respuesta no es el del login.** Trae lo que viaja
 *    adentro del token —roles, abogado y permisos— y no el nombre ni el
 *    correo. El frontend conserva el usuario del login.
 */
const refresh: Handler = ({ request }) => {
    const user = userForRenewal(request.token);
    if (!user) return fail(401, ERRORS.unauthenticatedAuth);

    // Rotación: el token vencido se da de baja y se emite uno nuevo.
    revokeToken(request.token as string);

    const renewed: RefreshedSession = {
        accessToken: issueToken(user.id),
        tokenType: 'Bearer',
        expiresIn: EXPIRES_IN,
        user: {
            id: user.id,
            username: user.username,
            roles: [...user.roles],
            lawyerId: user.lawyerId,
            permissions: permissionsFor(user.roles),
        },
    };
    return ok(itemBody(renewed));
};

const logout: Handler = ({ request }) => {
    const auth = requireSession(request);
    if (!auth.ok) return auth.response;

    revokeToken(request.token as string);
    return NO_CONTENT;
};

const changePassword: Handler = ({ request }) => {
    const auth = requireSession(request);
    if (!auth.ok) return auth.response;

    const body = asObject(request.body);
    const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const next = typeof body.newPassword === 'string' ? body.newPassword : '';

    const details: Record<string, string> = {};
    if (current === '') details.currentPassword = 'La contraseña actual es obligatoria.';
    if (next === '') details.newPassword = 'La contraseña nueva es obligatoria.';
    else if (!isValidPassword(next)) {
        details.newPassword = 'La contraseña no cumple con los requisitos establecidos.';
    }
    if (Object.keys(details).length > 0) return validationError(details);

    if (db.passwords.get(auth.user.username) !== current) {
        return fail(422, ERRORS.invalidCurrentPassword);
    }

    db.passwords.set(auth.user.username, next);
    // La sesión actual sigue viva: el contrato no pide cerrarla.
    return NO_CONTENT;
};

/* ------------------------------------------------------------------ */
/* /users                                                              */
/* ------------------------------------------------------------------ */

/** Entero de un parámetro de ruta. `undefined` si no lo es. */
function readRouteId(params: Record<string, string>, key: string): number | undefined {
    const raw = params[key] ?? '';
    if (!/^\d+$/.test(raw)) return undefined;
    return Number(raw);
}

function usernameTaken(username: string, exceptId?: number): boolean {
    return db.users.some(
        (u) => u.id !== exceptId && u.username.toLowerCase() === username.toLowerCase(),
    );
}

function emailTaken(email: string, exceptId?: number): boolean {
    return db.users.some((u) => u.id !== exceptId && u.email.toLowerCase() === email.toLowerCase());
}

/**
 * `true` si el abogado ya tiene una cuenta activa, sin contar la del usuario
 * `exceptUserId`: en una edición, volver a mandar el mismo abogado no es un
 * choque consigo mismo. Mismo criterio que el backend.
 */
function lawyerLinked(lawyerId: number, exceptUserId?: number): boolean {
    return db.users.some((u) => u.active && u.lawyerId === lawyerId && u.id !== exceptUserId);
}

/** Sin matrícula no hay choque: varios abogados pueden no tenerla. */
function registrationTaken(registrationNumber: string | null, exceptId?: number): boolean {
    if (registrationNumber === null) return false;
    return db.lawyers.some((l) => l.id !== exceptId && l.registrationNumber === registrationNumber);
}

const createUser: Handler = ({ request }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const body = asObject(request.body);
    const username = asText(body.username);
    const email = asText(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const roles = normalizeRoles(body.roles);

    const details: Record<string, string> = {};
    if (!RE_USERNAME.test(username)) {
        details.username = 'El nombre de usuario no cumple con el formato requerido.';
    }
    const { lastName, firstName } = readPersonName(body, details);
    if (!RE_EMAIL.test(email)) details.email = 'El correo electrónico no es válido.';
    if (!isValidPassword(password)) {
        details.password = 'La contraseña no cumple con los requisitos establecidos.';
    }
    if (!roles) details.roles = 'Debe indicarse al menos un rol válido.';

    /* `lawyerId` y `lawyer` son mutuamente excluyentes: mandar los dos es
       ambiguo —¿vinculo el que existe o creo uno nuevo?— y el contrato lo
       prohíbe explícitamente. */
    const hasLawyerId = body.lawyerId !== undefined && body.lawyerId !== null;
    const hasInlineLawyer = body.lawyer !== undefined && body.lawyer !== null;
    if (hasLawyerId && hasInlineLawyer) {
        details.lawyer = 'Debe enviarse lawyerId o lawyer, no ambos.';
    }
    if (Object.keys(details).length > 0) return validationError(details);

    const validRoles = roles as Role[];

    if (usernameTaken(username)) return fail(409, ERRORS.usernameTaken);
    if (emailTaken(email)) return fail(409, ERRORS.emailTaken);

    /* Regla de negocio: un usuario que ejerce necesita ficha profesional, y
       un usuario de secretaría no la lleva. */
    if (needsLawyer(validRoles) && !hasLawyerId && !hasInlineLawyer) {
        return fail(422, businessRuleViolation('createUser'));
    }
    if (!needsLawyer(validRoles) && (hasLawyerId || hasInlineLawyer)) {
        return fail(422, businessRuleViolation('createUser'));
    }

    /* El alta con abogado nuevo es una transacción: se valida todo antes de
       escribir nada, así un fallo no deja un abogado huérfano. */
    let lawyerId: number | null = null;

    if (hasLawyerId) {
        const id = readCount(body.lawyerId, Number.MAX_SAFE_INTEGER);
        const lawyer = id === undefined ? undefined : db.lawyers.find((l) => l.id === id);
        if (!lawyer || !lawyer.active) return fail(422, businessRuleViolation('createUser'));
        // Un abogado tiene a lo sumo una cuenta activa.
        if (lawyerLinked(lawyer.id)) return fail(409, ERRORS.lawyerAlreadyLinked);
        lawyerId = lawyer.id;
    }

    let newLawyer: Lawyer | undefined;
    if (hasInlineLawyer) {
        const inline = asObject(body.lawyer);
        // La matrícula es opcional: si no viene, la ficha queda sin ella.
        const registrationNumber = optionalText(inline.registrationNumber);

        const lawyerDetails: Record<string, string> = {};
        const lawyerName = readPersonName(inline, lawyerDetails, { prefix: 'lawyer.' });
        if (registrationNumber !== null && !RE_REGISTRATION.test(registrationNumber)) {
            lawyerDetails['lawyer.registrationNumber'] = 'El formato de la matrícula no es válido.';
        }
        if (Object.keys(lawyerDetails).length > 0) return validationError(lawyerDetails);

        if (registrationTaken(registrationNumber)) return fail(409, ERRORS.registrationTaken);

        newLawyer = {
            id: db.nextLawyerId,
            lastName: lawyerName.lastName,
            firstName: lawyerName.firstName,
            registrationNumber,
            activeCases: 0,
            active: true,
        };
        lawyerId = newLawyer.id;
    }

    // A partir de acá no falla nada: recién ahora se escribe.
    if (newLawyer) {
        db.nextLawyerId += 1;
        db.lawyers.push(newLawyer);
    }

    const user: StoredUser = {
        id: db.nextUserId,
        username,
        lastName,
        firstName,
        email,
        roles: validRoles,
        lawyerId,
        lastLoginAt: null,
        active: true,
    };
    db.nextUserId += 1;
    db.users.push(user);
    db.passwords.set(username, password);

    return created(itemBody(toUser(user)));
};

const listUsers: Handler = ({ request }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const page = readPagination(request.query);
    if (!page.ok) return page.response;

    const role = request.query.get('role');
    if (role !== null && role !== '' && !isRole(role)) {
        return fail(400, ERRORS.invalidRole);
    }

    const search = asText(request.query.get('search'));
    /* Sólo los de alta. Un registro dado de baja no existe para el cliente. */
    const filtered = db.users
        .filter((u) => u.active)
        .filter((u) => (search === '' ? true : contains(u.username, search) || matchesPerson(u, search)))
        .filter((u) => (role === null || role === '' ? true : u.roles.includes(role as Role)))
        .sort((a, b) => a.id - b.id)
        .map(toUser);

    return ok(paginate(filtered, page.page, page.limit));
};

const getUser: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const userId = readRouteId(params, 'userId');
    if (userId === undefined) return fail(400, ERRORS.invalidUserId);

    /* Un registro dado de baja no existe para el cliente: 404, igual que uno
       que nunca existió. Devolverlo con `active: false` sería contarle que
       está ahí, y no hay nada que pueda hacer con eso. */
    const user = db.users.find((u) => u.id === userId && u.active);
    if (!user) return fail(404, ERRORS.userNotFound);

    return ok(itemBody(toUser(user)));
};

const updateUser: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const userId = readRouteId(params, 'userId');
    if (userId === undefined) return fail(400, ERRORS.invalidUserId);

    const body = asObject(request.body);
    const hasUsername = body.username !== undefined;
    const hasEmail = body.email !== undefined;
    const hasRoles = body.roles !== undefined;
    const hasLawyerId = body.lawyerId !== undefined;
    const hasName = body.lastName !== undefined || body.firstName !== undefined;

    if (!hasUsername && !hasName && !hasEmail && !hasRoles && !hasLawyerId) {
        return validationError({ body: 'Debe enviarse al menos un campo para modificar.' });
    }

    const details: Record<string, string> = {};
    const username = asText(body.username);
    const email = asText(body.email);

    if (hasUsername && !RE_USERNAME.test(username)) {
        details.username = 'El nombre de usuario no cumple con el formato requerido.';
    }
    const name = readPersonName(body, details, { partial: true });
    if (hasEmail && !RE_EMAIL.test(email)) details.email = 'El correo electrónico no es válido.';

    const roles = hasRoles ? normalizeRoles(body.roles) : undefined;
    if (hasRoles && !roles) details.roles = 'Debe indicarse al menos un rol válido.';
    if (Object.keys(details).length > 0) return validationError(details);

    const user = db.users.find((u) => u.id === userId && u.active);
    if (!user) return fail(404, ERRORS.userNotFound);

    if (hasUsername && usernameTaken(username, userId)) return fail(409, ERRORS.usernameTaken);
    if (hasEmail && emailTaken(email, userId)) return fail(409, ERRORS.emailTaken);

    // Regla de negocio: el sistema conserva siempre un administrador.
    const losesAdmin = roles !== undefined && !roles.includes('ADMINISTRATOR');
    if (userId === PROTECTED_ADMIN_USER && losesAdmin) {
        return fail(422, businessRuleViolation('updateUser'));
    }

    /* `lawyerId: null` desvincula; un id tiene que apuntar a un abogado
       activo. Es la única forma de expresar "sacale la ficha". */
    let nextLawyerId = user.lawyerId;
    if (hasLawyerId) {
        if (body.lawyerId === null) {
            nextLawyerId = null;
        } else {
            const id = readCount(body.lawyerId, Number.MAX_SAFE_INTEGER);
            const lawyer = id === undefined ? undefined : db.lawyers.find((l) => l.id === id);
            if (!lawyer || !lawyer.active) return fail(422, businessRuleViolation('updateUser'));
            if (lawyerLinked(lawyer.id, userId)) return fail(409, ERRORS.lawyerAlreadyLinked);
            nextLawyerId = lawyer.id;
        }
    }

    // El vínculo se valida contra los roles que van a QUEDAR, no los de antes.
    const nextRoles = roles ?? user.roles;
    if (needsLawyer(nextRoles) && nextLawyerId === null) {
        return fail(422, businessRuleViolation('updateUser'));
    }

    if (hasUsername) {
        const password = db.passwords.get(user.username);
        db.passwords.delete(user.username);
        if (password !== undefined) db.passwords.set(username, password);
        user.username = username;
    }
    if (name.hasLastName) user.lastName = name.lastName;
    if (name.hasFirstName) user.firstName = name.firstName;
    if (hasEmail) user.email = email;
    if (roles) user.roles = roles;
    if (hasLawyerId) user.lawyerId = nextLawyerId;

    return ok(itemBody(toUser(user)));
};

const deleteUser: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const userId = readRouteId(params, 'userId');
    if (userId === undefined) return fail(400, ERRORS.invalidUserId);

    const user = db.users.find((u) => u.id === userId && u.active);
    if (!user) return fail(404, ERRORS.userNotFound);

    if (USERS_WITH_DEPENDENCIES.includes(userId)) {
        return fail(409, ERRORS.userHasDependencies);
    }
    if (userId === PROTECTED_ADMIN_USER) {
        return fail(422, businessRuleViolation('deleteUser'));
    }

    // Baja lógica: el registro queda, pierde el acceso y sale de los listados.
    user.active = false;
    revokeUserSessions(userId);

    return NO_CONTENT;
};

/* ------------------------------------------------------------------ */
/* /lawyers                                                            */
/* ------------------------------------------------------------------ */

const createLawyer: Handler = ({ request }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const body = asObject(request.body);
    // La matrícula es opcional: si no viene, la ficha queda sin ella.
    const registrationNumber = optionalText(body.registrationNumber);

    const details: Record<string, string> = {};
    const { lastName, firstName } = readPersonName(body, details);
    if (registrationNumber !== null && !RE_REGISTRATION.test(registrationNumber)) {
        details.registrationNumber = 'El formato de la matrícula no es válido.';
    }
    if (Object.keys(details).length > 0) return validationError(details);

    if (registrationTaken(registrationNumber)) return fail(409, ERRORS.registrationTaken);

    const lawyer: Lawyer = {
        id: db.nextLawyerId,
        lastName,
        firstName,
        registrationNumber,
        activeCases: 0,
        active: true,
    };
    db.nextLawyerId += 1;
    db.lawyers.push(lawyer);

    return created(itemBody(toLawyer(lawyer)));
};

/* Leer abogados está abierto a cualquier perfil (V3 D-03): el alta de causa,
   que opera cualquiera, necesita el listado para elegir al responsable. */
const listLawyers: Handler = ({ request }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const page = readPagination(request.query);
    if (!page.ok) return page.response;

    const search = asText(request.query.get('search'));
    const filtered = db.lawyers
        .filter((l) => l.active)
        .filter((l) =>
            search === ''
                ? true
                : matchesPerson(l, search) || contains(l.registrationNumber ?? '', search),
        )
        .sort((a, b) => a.id - b.id)
        .map(toLawyer);

    return ok(paginate(filtered, page.page, page.limit));
};

const getLawyer: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const lawyerId = readRouteId(params, 'lawyerId');
    if (lawyerId === undefined) return fail(400, ERRORS.invalidLawyerId);

    const lawyer = db.lawyers.find((l) => l.id === lawyerId && l.active);
    if (!lawyer) return fail(404, ERRORS.lawyerNotFound);

    return ok(itemBody(toLawyer(lawyer)));
};

const updateLawyer: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const lawyerId = readRouteId(params, 'lawyerId');
    if (lawyerId === undefined) return fail(400, ERRORS.invalidLawyerId);

    const body = asObject(request.body);
    const hasName = body.lastName !== undefined || body.firstName !== undefined;
    const hasRegistration = body.registrationNumber !== undefined;
    if (!hasName && !hasRegistration) {
        return validationError({ body: 'Debe enviarse al menos un campo para modificar.' });
    }

    /* Apellido y nombres son obligatorios en la ficha: se pueden omitir, pero
       un `null` o un texto vacío es un `400` (CA-14.4). La matrícula no: en
       `null` (o vacía) se borra. */
    const details: Record<string, string> = {};
    const registrationNumber = optionalText(body.registrationNumber);
    const name = readPersonName(body, details, { partial: true });
    if (hasRegistration && registrationNumber !== null && !RE_REGISTRATION.test(registrationNumber)) {
        details.registrationNumber = 'El formato de la matrícula no es válido.';
    }
    // El tratamiento no es parte del nombre (V4 D-81, V5 §3.3).
    if (name.hasFirstName && !details.firstName && /^dra?\.?(\s|$)/i.test(name.firstName)) {
        details.firstName = 'Sin "Dr." ni "Dra.": el tratamiento no es parte del nombre.';
    }
    if (body.activeCases !== undefined) details.activeCases = 'Lo calcula el sistema: no se modifica.';
    if (Object.keys(details).length > 0) return validationError(details);

    const lawyer = db.lawyers.find((l) => l.id === lawyerId && l.active);
    if (!lawyer) return fail(404, ERRORS.lawyerNotFound);

    // Su propia matrícula no es un conflicto (CA-14.3).
    if (hasRegistration && registrationTaken(registrationNumber, lawyerId)) {
        return fail(409, ERRORS.registrationTaken);
    }

    if (name.hasLastName) lawyer.lastName = name.lastName;
    if (name.hasFirstName) lawyer.firstName = name.firstName;
    if (hasRegistration) lawyer.registrationNumber = registrationNumber;

    /* Cambiar el nombre renombra la carpeta del abogado, y con ella la ruta de
       sus causas (V5 D-104). Si Drive no responde, la modificación se guarda
       igual y las carpetas creadas quedan con el nombre anterior. */
    if (hasName) {
        for (const c of db.cases) {
            if (c.responsibleLawyerId !== lawyer.id || !c.folder) continue;
            if (c.folder.status !== 'CREATED' || !db.failures.documentStorage) c.folder.path = expectedFolderPath(c);
        }
    }

    return ok(itemBody(toLawyer(lawyer)));
};

const deleteLawyer: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const lawyerId = readRouteId(params, 'lawyerId');
    if (lawyerId === undefined) return fail(400, ERRORS.invalidLawyerId);

    const lawyer = db.lawyers.find((l) => l.id === lawyerId && l.active);
    if (!lawyer) return fail(404, ERRORS.lawyerNotFound);

    /* "El abogado posee causas o un usuario vinculado" (§5.3). Las causas se
       cuentan de la base, activas o no: la causa lo sigue nombrando como
       responsable y no hay todavía a quién reasignarla (C-17). */
    const linked = db.users.some((u) => u.active && u.lawyerId === lawyerId);
    const hasCases = db.cases.some((c) => c.active && c.responsibleLawyerId === lawyerId);
    if (linked || hasCases) {
        return fail(409, ERRORS.lawyerHasDependencies);
    }

    lawyer.active = false;
    return NO_CONTENT;
};

/* ------------------------------------------------------------------ */
/* /procedural-states                                                  */
/* ------------------------------------------------------------------ */

/**
 * La unicidad es por **nombre + fuero**, no por nombre solo: dos fueros
 * pueden tener un estado que se llame igual (una "Apelación" penal y una
 * administrativa son dos cosas distintas con dos plazos distintos).
 *
 * Es entre los vigentes, como el índice de la base
 * (`procedural_states_jurisdiction_name_active_key`): el nombre de un estado
 * dado de baja se puede volver a usar.
 *
 * "Iniciada" está reservada en los tres fueros: es el estado inicial, que es
 * de sistema y no figura en la tabla (V3 D-34).
 */
function stateNameTaken(name: string, jurisdiction: Jurisdiction, exceptId?: number): boolean {
    if (name.toLowerCase() === INITIAL_STATE_NAME.toLowerCase()) return true;
    return db.proceduralStates.some(
        (s) =>
            s.active &&
            s.id !== exceptId &&
            s.jurisdiction === jurisdiction &&
            s.name.toLowerCase() === name.toLowerCase(),
    );
}

/** El `dayType` tiene que ser coherente con el plazo. */
function dayTypeMismatch(timeLimitDays: number, dayType: DayType): boolean {
    return (timeLimitDays === 0) !== (dayType === 'NONE');
}

const createProceduralState: Handler = ({ request }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const body = asObject(request.body);
    const name = asText(body.name);

    const details: Record<string, string> = {};
    if (!isValidStateName(name)) {
        details.name = `Debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres.`;
    }
    if (!isJurisdiction(body.jurisdiction)) {
        details.jurisdiction = 'No existe un fuero procesal con ese nombre.';
    }

    const timeLimitDays = body.timeLimitDays === undefined ? 0 : readCount(body.timeLimitDays, 9999);
    if (timeLimitDays === undefined) {
        details.timeLimitDays = 'Debe ser un número entero entre 0 y 9999.';
    }

    const dayType: DayType = body.dayType === undefined ? 'NONE' : (body.dayType as DayType);
    if (body.dayType !== undefined && !isDayType(body.dayType)) {
        details.dayType = 'Debe ser BUSINESS, CONSECUTIVE o NONE.';
    }

    if (body.terminal !== undefined && typeof body.terminal !== 'boolean') {
        details.terminal = 'Debe ser verdadero o falso.';
    }
    if (Object.keys(details).length > 0) return validationError(details);

    const jurisdiction = body.jurisdiction as Jurisdiction;
    const days = timeLimitDays as number;

    if (dayTypeMismatch(days, dayType)) {
        return validationError({
            dayType:
                days === 0
                    ? 'Debe ser NONE cuando el plazo es 0.'
                    : 'Debe indicarse el tipo de día cuando el plazo es mayor a 0.',
        });
    }

    if (stateNameTaken(name, jurisdiction)) {
        return fail(409, ERRORS.proceduralStateNameTaken);
    }

    /* Los estados no tienen posición (V3 D-31): el nuevo queda al final del
       listado de su fuero porque se lista por orden de registro. */
    const state: StoredProceduralState = {
        id: db.nextProceduralStateId,
        name,
        jurisdiction,
        timeLimitDays: days,
        dayType,
        terminal: body.terminal === true,
        active: true,
    };
    db.nextProceduralStateId += 1;
    db.proceduralStates.push(state);

    // Sin `activeCases`: es un dato de consulta, sólo de los `GET` (V3 D-32).
    return created(itemBody({ ...state }));
};

/* Leer los estados está abierto a cualquier perfil (V3 D-03): consultar
   estados y plazos es de los tres, y registrar un acto necesita los del fuero. */
const listProceduralStates: Handler = ({ request }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const page = readPagination(request.query);
    if (!page.ok) return page.response;

    const jurisdiction = request.query.get('jurisdiction');
    if (jurisdiction !== null && jurisdiction !== '' && !isJurisdiction(jurisdiction)) {
        return fail(400, ERRORS.invalidJurisdiction);
    }

    const search = asText(request.query.get('search'));
    const filtered = db.proceduralStates
        .filter((s) => s.active)
        .filter((s) => (search === '' ? true : contains(s.name, search)))
        .filter((s) => (jurisdiction === null || jurisdiction === '' ? true : s.jurisdiction === jurisdiction))
        /* El contrato fija el orden: por fuero y, dentro de cada uno, por
           orden de registro (`id` ascendente). El estado inicial "Iniciada" no
           está en la base, así que no hay nada que excluir. */
        .sort((a, b) =>
            a.jurisdiction === b.jurisdiction
                ? a.id - b.id
                : JURISDICTIONS.indexOf(a.jurisdiction) - JURISDICTIONS.indexOf(b.jurisdiction),
        )
        .map(toProceduralState);

    return ok(paginate(filtered, page.page, page.limit));
};

const getProceduralState: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const stateId = readRouteId(params, 'stateId');
    if (stateId === undefined) return fail(400, ERRORS.invalidProceduralStateId);

    const state = db.proceduralStates.find((s) => s.id === stateId && s.active);
    if (!state) return fail(404, ERRORS.proceduralStateNotFound);

    return ok(itemBody(toProceduralState(state)));
};

const updateProceduralState: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const stateId = readRouteId(params, 'stateId');
    if (stateId === undefined) return fail(400, ERRORS.invalidProceduralStateId);

    const body = asObject(request.body);
    const hasName = body.name !== undefined;
    const hasJurisdiction = body.jurisdiction !== undefined;
    const hasTimeLimit = body.timeLimitDays !== undefined;
    const hasDayType = body.dayType !== undefined;
    const hasTerminal = body.terminal !== undefined;
    if (!hasName && !hasJurisdiction && !hasTimeLimit && !hasDayType && !hasTerminal) {
        return validationError({ body: 'Debe enviarse al menos un campo para modificar.' });
    }

    const details: Record<string, string> = {};
    const name = asText(body.name);
    if (hasName && !isValidStateName(name)) {
        details.name = `Debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres.`;
    }

    /* El fuero no es modificable (V3 D-36): se rechaza aunque venga con el
       valor que ya tiene. Para trasladar un estado, baja y alta. */
    if (hasJurisdiction) {
        details.jurisdiction = 'El fuero de un estado procesal no se puede modificar.';
    }

    const timeLimitDays = hasTimeLimit ? readCount(body.timeLimitDays, 9999) : undefined;
    if (hasTimeLimit && timeLimitDays === undefined) {
        details.timeLimitDays = 'Debe ser un número entero entre 0 y 9999.';
    }
    if (hasDayType && !isDayType(body.dayType)) {
        details.dayType = 'Debe ser BUSINESS, CONSECUTIVE o NONE.';
    }
    if (hasTerminal && typeof body.terminal !== 'boolean') {
        details.terminal = 'Debe ser verdadero o falso.';
    }
    if (Object.keys(details).length > 0) return validationError(details);

    const state = db.proceduralStates.find((s) => s.id === stateId && s.active);
    if (!state) return fail(404, ERRORS.proceduralStateNotFound);

    // "Prescripta" es de sistema: renombrarlo dejaría a HU33 sin destino (V4 D-53).
    if (state.id === PRESCRIBED_STATE_ID) return fail(422, ERRORS.proceduralStateProtected);

    // La coherencia se chequea contra los valores que van a QUEDAR.
    const nextDays = timeLimitDays ?? state.timeLimitDays;
    const nextDayType = hasDayType ? (body.dayType as DayType) : state.dayType;
    if (dayTypeMismatch(nextDays, nextDayType)) {
        return validationError({
            dayType:
                nextDays === 0
                    ? 'Debe ser NONE cuando el plazo es 0.'
                    : 'Debe indicarse el tipo de día cuando el plazo es mayor a 0.',
        });
    }

    const nextName = hasName ? name : state.name;
    if (hasName && stateNameTaken(nextName, state.jurisdiction, stateId)) {
        return fail(409, ERRORS.proceduralStateNameTaken);
    }

    state.name = nextName;
    state.timeLimitDays = nextDays;
    state.dayType = nextDayType;
    if (hasTerminal) state.terminal = body.terminal as boolean;

    // Sin `activeCases`, igual que el alta (V3 D-32).
    return ok(itemBody({ ...state }));
};

const deleteProceduralState: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const stateId = readRouteId(params, 'stateId');
    if (stateId === undefined) return fail(400, ERRORS.invalidProceduralStateId);

    const state = db.proceduralStates.find((s) => s.id === stateId && s.active);
    if (!state) return fail(404, ERRORS.proceduralStateNotFound);

    if (state.id === PRESCRIBED_STATE_ID) return fail(422, ERRORS.proceduralStateProtected);

    /* La baja procede aunque haya causas en el estado (V3 D-06): lo conservan
       y lo siguen mostrando, porque `toCase` lo busca también entre los dados
       de baja. Lo único que cambia es que ningún acto puede volver a llevar
       una causa a él. */
    state.active = false;

    return NO_CONTENT;
};

/* ------------------------------------------------------------------ */
/* Helpers de los recursos del Sprint 2                                */
/* ------------------------------------------------------------------ */

/** `400 INVALID_REQUEST`: un parámetro de consulta inválido o mal combinado. */
function invalidQuery(details: Record<string, string>): MockResponse {
    return fail(400, errorBody('INVALID_REQUEST', 'Parámetros de query inválidos.', details));
}

/** Texto opcional del cuerpo: `null` si no vino o vino vacío. */
function optionalText(value: unknown): string | null {
    const text = asText(value);
    return text === '' ? null : text;
}

/** `true` si el campo viajó con algún contenido. Un `null` o un `''` no cuentan. */
function isPresent(value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
}

/** Id entero positivo del cuerpo. `undefined` si no lo es. */
function readBodyId(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

type QueryValue<T> = { ok: true; value: T | undefined } | { ok: false };

/** Id entero de la query. Ausente o vacío es "sin filtro"; otra cosa, inválido. */
function readQueryId(query: URLSearchParams, name: string): QueryValue<number> {
    const raw = query.get(name);
    if (raw === null || raw.trim() === '') return { ok: true, value: undefined };
    if (!/^\d+$/.test(raw.trim())) return { ok: false };
    return { ok: true, value: Number(raw) };
}

/** Booleano de la query: `true` o `false`. Ausente es "sin filtro". */
function readQueryBoolean(query: URLSearchParams, name: string): QueryValue<boolean> {
    const raw = query.get(name);
    if (raw === null || raw.trim() === '') return { ok: true, value: undefined };
    if (raw !== 'true' && raw !== 'false') return { ok: false };
    return { ok: true, value: raw === 'true' };
}

const MSG_NOT_INTEGER = 'Debe ser un número entero válido.';
const MSG_NOT_BOOLEAN = 'Debe ser true o false.';
const MSG_NOT_DATE = 'Debe ser una fecha válida con el formato AAAA-MM-DD.';

/** Orden alfabético como lo lee una persona: sin que la tilde mande al final. */
function byText(a: string, b: string): number {
    return a.localeCompare(b, 'es', { sensitivity: 'base' });
}

/* ------------------------------------------------------------------ */
/* /legal-qualifications                                               */
/* ------------------------------------------------------------------ */

const QUALIFICATION_NAME_MAX = 255;

/** Única entre las vigentes, sin distinguir mayúsculas (§3.5). */
function qualificationNameTaken(name: string, exceptId?: number): boolean {
    return db.legalQualifications.some(
        (q) => q.active && q.id !== exceptId && q.name.toLowerCase() === name.toLowerCase(),
    );
}

function qualificationNameError(name: string): string | undefined {
    if (name === '') return 'No puede estar vacío.';
    if (name.length > QUALIFICATION_NAME_MAX) {
        return `Puede tener hasta ${QUALIFICATION_NAME_MAX} caracteres.`;
    }
    return undefined;
}

/** Meses de prescripción: entero mayor o igual a 1. */
function readPrescriptionMonths(value: unknown): number | undefined {
    const months = readCount(value, 9999);
    return months === undefined || months < 1 ? undefined : months;
}

const MSG_PRESCRIPTION = 'Debe ser un número entero mayor o igual a 1.';

const createLegalQualification: Handler = ({ request }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const body = asObject(request.body);
    const name = asText(body.name);
    const months = readPrescriptionMonths(body.prescriptionMonths);

    const details: Record<string, string> = {};
    const nameError = qualificationNameError(name);
    if (nameError) details.name = nameError;
    if (months === undefined) details.prescriptionMonths = MSG_PRESCRIPTION;
    if (Object.keys(details).length > 0) return validationError(details);

    if (qualificationNameTaken(name)) return fail(409, ERRORS.legalQualificationNameTaken);

    const qualification: StoredLegalQualification = {
        id: db.nextLegalQualificationId,
        name,
        prescriptionMonths: months as number,
        active: true,
    };
    db.nextLegalQualificationId += 1;
    db.legalQualifications.push(qualification);

    // Sin `activeCases`: es un dato de consulta, sólo de los `GET` (V3 D-32).
    return created(itemBody({ ...qualification }));
};

const listLegalQualifications: Handler = ({ request }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const page = readPagination(request.query);
    if (!page.ok) return page.response;

    const search = asText(request.query.get('search'));
    const filtered = db.legalQualifications
        .filter((q) => q.active)
        // El nombre incluye el artículo, así que "art. 162" también encuentra.
        .filter((q) => (search === '' ? true : contains(q.name, search)))
        .sort((a, b) => byText(a.name, b.name))
        .map(toLegalQualification);

    return ok(paginate(filtered, page.page, page.limit));
};

const getLegalQualification: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const id = readRouteId(params, 'qualificationId');
    if (id === undefined) return fail(400, ERRORS.invalidLegalQualificationId);

    const qualification = db.legalQualifications.find((q) => q.id === id && q.active);
    if (!qualification) return fail(404, ERRORS.legalQualificationNotFound);

    return ok(itemBody(toLegalQualification(qualification)));
};

const updateLegalQualification: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const id = readRouteId(params, 'qualificationId');
    if (id === undefined) return fail(400, ERRORS.invalidLegalQualificationId);

    const body = asObject(request.body);
    const hasName = body.name !== undefined;
    const hasMonths = body.prescriptionMonths !== undefined;
    if (!hasName && !hasMonths) {
        return validationError({ body: 'Debe enviarse al menos un campo para modificar.' });
    }

    const details: Record<string, string> = {};
    const name = asText(body.name);
    const nameError = hasName ? qualificationNameError(name) : undefined;
    if (nameError) details.name = nameError;
    const months = hasMonths ? readPrescriptionMonths(body.prescriptionMonths) : undefined;
    if (hasMonths && months === undefined) details.prescriptionMonths = MSG_PRESCRIPTION;
    if (Object.keys(details).length > 0) return validationError(details);

    const qualification = db.legalQualifications.find((q) => q.id === id && q.active);
    if (!qualification) return fail(404, ERRORS.legalQualificationNotFound);

    if (hasName && qualificationNameTaken(name, id)) {
        return fail(409, ERRORS.legalQualificationNameTaken);
    }

    if (hasName) qualification.name = name;
    /* Cambiar el plazo recalcula la prescripción de las causas que la
       registran (D-08): no hay nada que propagar, porque la causa lee los
       meses de acá cada vez que se serializa. */
    if (months !== undefined) qualification.prescriptionMonths = months;

    // Sin `activeCases`, igual que el alta (V3 D-32).
    return ok(itemBody({ ...qualification }));
};

const deleteLegalQualification: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const id = readRouteId(params, 'qualificationId');
    if (id === undefined) return fail(400, ERRORS.invalidLegalQualificationId);

    const qualification = db.legalQualifications.find((q) => q.id === id && q.active);
    if (!qualification) return fail(404, ERRORS.legalQualificationNotFound);

    // Procede aunque haya causas que la registren: la conservan (D-06).
    qualification.active = false;
    return NO_CONTENT;
};

/* ------------------------------------------------------------------ */
/* /clients                                                            */
/* ------------------------------------------------------------------ */

const CLIENT_NAME_MAX = 100;
const CLIENT_PHONE_MAX = 50;

const CLIENT_ADDRESS_MAX = 255;

/** DNI: 7 u 8 dígitos, sin puntos (V3 D-17). */
const RE_DNI = /^\d{7,8}$/;

/** Pasaporte: letras y números en mayúsculas, de 6 a 20. */
const RE_PASSPORT = /^[A-Z0-9]{6,20}$/;

const DOCUMENT_TYPES: readonly DocumentType[] = ['DNI', 'PASSPORT'];

function isDocumentType(value: unknown): value is DocumentType {
    return DOCUMENT_TYPES.includes(value as DocumentType);
}

/**
 * Único por tipo entre los clientes vigentes: uno dado de baja libera su
 * documento, y un DNI y un pasaporte con el mismo número no chocan.
 */
function documentTaken(documentType: DocumentType, documentNumber: string): boolean {
    return db.clients.some(
        (c) => c.active && c.documentType === documentType && c.documentNumber === documentNumber,
    );
}

const createClient: Handler = ({ request }) => {
    // Administrar clientes es de los tres perfiles (V3 D-39).
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const body = asObject(request.body);
    const lastName = asText(body.lastName);
    const firstName = asText(body.firstName);
    const documentType = body.documentType;
    const documentNumber = asText(body.documentNumber);
    const address = asText(body.address);
    const phone = asText(body.phone);
    const email = optionalText(body.email);

    const details: Record<string, string> = {};
    if (lastName === '') details.lastName = 'El apellido es obligatorio.';
    else if (lastName.length > CLIENT_NAME_MAX) {
        details.lastName = `Puede tener hasta ${CLIENT_NAME_MAX} caracteres.`;
    }
    if (firstName === '') details.firstName = 'Los nombres son obligatorios.';
    else if (firstName.length > CLIENT_NAME_MAX) {
        details.firstName = `Puede tener hasta ${CLIENT_NAME_MAX} caracteres.`;
    }
    if (!isDocumentType(documentType)) {
        details.documentType = 'El tipo de documento no es válido.';
    } else if (documentType === 'DNI' && !RE_DNI.test(documentNumber)) {
        details.documentNumber = 'Debe contener 7 u 8 dígitos, sin puntos.';
    } else if (documentType === 'PASSPORT' && !RE_PASSPORT.test(documentNumber)) {
        details.documentNumber = 'Debe contener de 6 a 20 letras y números, sin espacios.';
    }
    // Obligatorios desde D-109: uno de solo espacios se rechaza como vacío.
    if (address === '') details.address = 'La dirección es obligatoria.';
    else if (address.length > CLIENT_ADDRESS_MAX) {
        details.address = 'La dirección no puede superar los 255 caracteres.';
    }
    if (phone === '') details.phone = 'El teléfono es obligatorio.';
    else if (phone.length > CLIENT_PHONE_MAX) {
        details.phone = 'El teléfono no puede superar los 50 caracteres.';
    }
    if (email !== null && !RE_EMAIL.test(email)) {
        details.email = 'El formato del correo electrónico no es válido.';
    }
    if (Object.keys(details).length > 0 || !isDocumentType(documentType)) return validationError(details);

    if (documentTaken(documentType, documentNumber)) return fail(409, ERRORS.clientDniTaken);

    // El backend guarda apellido y nombres tal como llegan; la fecha de alta
    // la pone él.
    const client: StoredClient = {
        id: db.nextClientId,
        lastName,
        firstName,
        documentType,
        documentNumber,
        address,
        phone,
        email,
        clientSince: todayIso(),
        active: true,
    };
    db.nextClientId += 1;
    db.clients.push(client);

    return created(itemBody(toClient(client)));
};

const listClients: Handler = ({ request }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const page = readPagination(request.query);
    if (!page.ok) return page.response;

    const search = asText(request.query.get('search'));
    // El documento se busca como se guarda: quien escribe "34.812" busca "34812".
    const compact = search.replace(/[.\s]/g, '').toUpperCase();
    const filtered = db.clients
        .filter((c) => c.active)
        .filter((c) =>
            search === ''
                ? true
                : contains(c.lastName, search) ||
                  contains(c.firstName, search) ||
                  (/^[A-Z0-9]+$/.test(compact) && c.documentNumber.includes(compact)),
        )
        .sort((a, b) => byText(a.lastName, b.lastName) || byText(a.firstName, b.firstName))
        .map(toClient);

    return ok(paginate(filtered, page.page, page.limit));
};

const getClient: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const clientId = readRouteId(params, 'clientId');
    if (clientId === undefined) return fail(400, ERRORS.invalidClientId);

    const client = db.clients.find((c) => c.id === clientId && c.active);
    if (!client) return fail(404, ERRORS.clientNotFound);

    return ok(itemBody(toClient(client)));
};

/* ------------------------------------------------------------------ */
/* /cases                                                              */
/* ------------------------------------------------------------------ */

/** Número de SAC: exactamente 8 dígitos (V3 D-16). Es opcional (D-33). */
const RE_SAC = /^\d{8}$/;

const CAPTION_MAX = 255;
const COURT_MAX = 255;
const INSTRUCTOR_NAME_MAX = 150;
const TRIBUNAL_PHONE_MAX = 50;
const INSTRUCTOR_EXTENSION_MAX = 20;
const COUNTERPARTY_MAX = 255;
const SUBJECT_MATTER_MAX = 800;

const MSG_ONLY_CRIMINAL = 'Solo corresponde al fuero penal.';
const MSG_NOT_CRIMINAL = 'Solo corresponde a los fueros administrativo y de amparo.';

function isProceduralRole(value: unknown, jurisdiction: Jurisdiction): value is ProceduralRole {
    return (
        typeof value === 'string' &&
        (PROCEDURAL_ROLES_BY_JURISDICTION[jurisdiction] as readonly string[]).includes(value)
    );
}

type QualificationsResult =
    | { ok: true; value: StoredCaseQualification[] }
    | { ok: false; message: string };

/**
 * Las calificaciones de una causa penal. Son opcionales (V3 D-33): sin el
 * campo, o con la lista vacía, la causa se registra sin calificaciones y no
 * computa prescripción. Si vienen, van sin repetir, todas vigentes y cada una
 * con la fecha de su hecho (D-28). Devuelve el primer problema que encuentra,
 * porque todos se informan sobre el mismo campo.
 */
function readCaseQualifications(value: unknown, today: string): QualificationsResult {
    if (value === undefined || value === null) return { ok: true, value: [] };
    if (!Array.isArray(value)) {
        return { ok: false, message: 'Debe ser una lista de calificaciones legales.' };
    }

    const result: StoredCaseQualification[] = [];
    for (const raw of value) {
        const item = asObject(raw);
        const id = readBodyId(item.legalQualificationId);
        const qualification = id === undefined
            ? undefined
            : db.legalQualifications.find((q) => q.id === id && q.active);
        if (!qualification) {
            return { ok: false, message: 'No existe una calificación legal vigente con ese identificador.' };
        }
        if (result.some((q) => q.legalQualificationId === qualification.id)) {
            return { ok: false, message: 'No puede repetirse una calificación legal.' };
        }
        if (!isPresent(item.offenseDate)) {
            return { ok: false, message: 'Cada calificación legal requiere la fecha del hecho.' };
        }
        if (!isIsoDate(item.offenseDate)) {
            return { ok: false, message: 'La fecha del hecho debe ser una fecha válida con el formato AAAA-MM-DD.' };
        }
        if (item.offenseDate > today) {
            return { ok: false, message: 'La fecha del hecho no puede ser posterior a hoy.' };
        }
        result.push({ legalQualificationId: qualification.id, offenseDate: item.offenseDate });
    }
    return { ok: true, value: result };
}

const createCase: Handler = ({ request }) => {
    // Cualquier perfil registra causas (RN11 y tabla de permisos).
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const body = asObject(request.body);
    const today = todayIso();
    const details: Record<string, string> = {};

    // El SAC es opcional (D-33); si viene, son 8 dígitos.
    const sacNumber = optionalText(body.sacNumber);
    if (sacNumber !== null && !RE_SAC.test(sacNumber)) {
        details.sacNumber = 'Debe contener exactamente 8 dígitos.';
    }

    const caption = asText(body.caption);
    if (caption === '') details.caption = 'La carátula es obligatoria.';
    else if (caption.length > CAPTION_MAX) {
        details.caption = `Puede tener hasta ${CAPTION_MAX} caracteres.`;
    }

    const court = optionalText(body.court);
    if (court !== null && court.length > COURT_MAX) {
        details.court = `Puede tener hasta ${COURT_MAX} caracteres.`;
    }
    const instructorName = optionalText(body.instructorName);
    if (instructorName !== null && instructorName.length > INSTRUCTOR_NAME_MAX) {
        details.instructorName = `Puede tener hasta ${INSTRUCTOR_NAME_MAX} caracteres.`;
    }
    const tribunalPhone = optionalText(body.tribunalPhone);
    if (tribunalPhone !== null && tribunalPhone.length > TRIBUNAL_PHONE_MAX) {
        details.tribunalPhone = `Puede tener hasta ${TRIBUNAL_PHONE_MAX} caracteres.`;
    }
    const instructorExtension = optionalText(body.instructorExtension);
    if (instructorExtension !== null && instructorExtension.length > INSTRUCTOR_EXTENSION_MAX) {
        details.instructorExtension = `Puede tener hasta ${INSTRUCTOR_EXTENSION_MAX} caracteres.`;
    }

    /* Un cliente, un abogado o una calificación que no existe o está dado de
       baja es un dato del formulario a corregir: `400` sobre el campo, no un
       `404` ni un `422` (V3 D-22). */
    const clientId = readBodyId(body.clientId);
    if (clientId === undefined || !db.clients.some((c) => c.id === clientId && c.active)) {
        details.clientId = 'No existe un cliente vigente con ese identificador.';
    }
    const lawyerId = readBodyId(body.responsibleLawyerId);
    if (lawyerId === undefined || !db.lawyers.some((l) => l.id === lawyerId && l.active)) {
        details.responsibleLawyerId = 'No existe un abogado vigente con ese identificador.';
    }

    /* La fecha de inicio va con el SAC (CA-18.2): obligatoria si se informa, y
       sin él no se manda. Sin SAC la causa queda sin fecha de inicio (D-38). */
    let startDate: string | null = null;
    if (sacNumber !== null && !isPresent(body.startDate)) {
        details.startDate = 'Es obligatoria cuando se informa el número de SAC.';
    } else if (sacNumber === null && isPresent(body.startDate)) {
        details.startDate = 'No se informa si la causa no tiene número de SAC.';
    } else if (isPresent(body.startDate)) {
        if (!isIsoDate(body.startDate)) details.startDate = MSG_NOT_DATE;
        else if (body.startDate > today) details.startDate = 'No puede ser posterior a hoy.';
        else startDate = body.startDate;
    }

    let qualifications: StoredCaseQualification[] = [];
    let counterparty: string | null = null;
    let subjectMatter: string | null = null;

    if (!isJurisdiction(body.jurisdiction)) {
        details.jurisdiction = 'No existe un fuero procesal con ese nombre.';
    } else {
        const jurisdiction = body.jurisdiction;

        if (!isProceduralRole(body.proceduralRole, jurisdiction)) {
            details.proceduralRole = 'El rol procesal no corresponde al fuero.';
        }

        if (jurisdiction === 'CRIMINAL') {
            // Lo que es de un fuero no viaja en otro.
            const read = readCaseQualifications(body.legalQualifications, today);
            if (read.ok) qualifications = read.value;
            else details.legalQualifications = read.message;

            if (isPresent(body.counterparty)) details.counterparty = MSG_NOT_CRIMINAL;
            if (isPresent(body.subjectMatter)) details.subjectMatter = MSG_NOT_CRIMINAL;
        } else {
            if (isPresent(body.legalQualifications)) {
                details.legalQualifications = MSG_ONLY_CRIMINAL;
            }

            counterparty = optionalText(body.counterparty);
            if (counterparty !== null && counterparty.length > COUNTERPARTY_MAX) {
                details.counterparty = `Puede tener hasta ${COUNTERPARTY_MAX} caracteres.`;
            }

            // El objeto del reclamo o del amparo es obligatorio (D-27).
            subjectMatter = optionalText(body.subjectMatter);
            if (subjectMatter === null) {
                details.subjectMatter = 'Es obligatorio en los fueros administrativo y de amparo.';
            } else if (subjectMatter.length > SUBJECT_MATTER_MAX) {
                details.subjectMatter = `Puede tener hasta ${SUBJECT_MATTER_MAX} caracteres.`;
            }
        }
    }

    const fueroData = readJurisdictionData(body, details, today);
    const courtFeePaid = body.courtFeePaid === undefined ? false : body.courtFeePaid;
    if (typeof courtFeePaid !== 'boolean') details.courtFeePaid = MSG_NOT_BOOL_FIELD;

    /* Las dos casillas de "Asignación y documentación" (V4 D-59): las dos
       vienen tildadas, y la segunda no se puede sin la primera. */
    const createFolder = body.createFolder === undefined ? true : body.createFolder;
    const copyTemplates = body.copyTemplates === undefined ? createFolder : body.copyTemplates;
    if (typeof createFolder !== 'boolean') details.createFolder = MSG_NOT_BOOL_FIELD;
    if (typeof copyTemplates !== 'boolean') details.copyTemplates = MSG_NOT_BOOL_FIELD;
    else if (copyTemplates && createFolder === false) details.copyTemplates = MSG_COPY_NEEDS_FOLDER;

    if (Object.keys(details).length > 0) return validationError(details);

    /* Si se informa, el SAC identifica la causa entre las vigentes (RN2): el
       de una causa dada de baja se puede volver a usar (V5 D-97). Dos causas
       sin SAC no chocan entre sí. */
    if (sacNumber !== null && db.cases.some((c) => c.active && c.sacNumber === sacNumber)) {
        return fail(409, ERRORS.caseSacTaken);
    }

    const stored: StoredCase = {
        id: db.nextCaseId,
        sacNumber,
        caption,
        court,
        jurisdiction: body.jurisdiction as Jurisdiction,
        proceduralRole: body.proceduralRole as ProceduralRole,
        instructorName,
        tribunalPhone,
        instructorExtension,
        counterparty,
        subjectMatter,
        ...fueroData,
        courtFeePaid: courtFeePaid as boolean,
        clientId: clientId as number,
        responsibleLawyerId: lawyerId as number,
        qualifications,
        startDate,
        folder: null,
        prescriptionDeclaration: null,
        active: true,
        deactivation: null,
    };

    /* La carpeta no condiciona el alta (V4 D-60): si el almacenamiento falla,
       la causa se registra igual y la carpeta queda en `ERROR`. Sin pedirla,
       queda `PENDING`. */
    stored.folder = createFolder ? newFolder(stored, copyTemplates as boolean) : newFolder(stored, false, 'PENDING');

    db.nextCaseId += 1;
    db.cases.push(stored);

    /* No se crea ningún acto: la causa nace en el estado inicial, "Iniciada",
       y sin vencimiento. El estado de la tabla lo fija el primer acto (D-34). */
    return created(itemBody(toCase(stored)));
};

const MSG_NOT_BOOL_FIELD = 'Debe ser verdadero o falso.';
const MSG_COPY_NEEDS_FOLDER = 'Para copiar los modelos primero hay que crear la carpeta de la causa.';
const MSG_ONLY_AMPARO = 'Solo corresponde al fuero de amparo.';
const MSG_ONLY_ADMINISTRATIVE = 'Solo corresponde al fuero administrativo.';

/** Un entero mayor o igual a 1. `undefined` si no lo es. */
function readPositiveInteger(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : undefined;
}

/**
 * Los datos propios de cada fuero en el alta de causa (V4 §3.7, D-67), todos
 * opcionales. Un dato de otro fuero es un `400` sobre su campo, como
 * `counterparty` en el penal. Devuelve lo que se guarda, con `null` en lo que
 * no corresponde al fuero.
 */
function readJurisdictionData(body: Record<string, unknown>, details: Record<string, string>, today: string) {
    const jurisdiction = isJurisdiction(body.jurisdiction) ? body.jurisdiction : null;
    const criminal = jurisdiction === 'CRIMINAL';
    const amparo = jurisdiction === 'AMPARO';
    const administrative = jurisdiction === 'ADMINISTRATIVE';

    const bool = (field: string, applies: boolean, wrongFuero: string): boolean | null => {
        const value = body[field];
        if (!applies) {
            if (jurisdiction !== null && value !== undefined && value !== null) details[field] = wrongFuero;
            return null;
        }
        if (value === undefined) return false;
        if (typeof value !== 'boolean') details[field] = MSG_NOT_BOOL_FIELD;
        return value === true;
    };
    const pastDate = (field: string, applies: boolean, wrongFuero: string): string | null => {
        const value = body[field];
        if (value === undefined || value === null || value === '') return null;
        if (!applies) {
            if (jurisdiction !== null) details[field] = wrongFuero;
            return null;
        }
        if (!isIsoDate(value)) details[field] = MSG_NOT_DATE;
        else if (value > today) details[field] = 'No puede ser posterior a hoy.';
        else return value;
        return null;
    };

    const clientDetained = bool('clientDetained', criminal, MSG_ONLY_CRIMINAL);
    const injunctionGranted = bool('injunctionGranted', amparo, MSG_ONLY_AMPARO);
    const administrativeRemedyExhaustedOn = pastDate('administrativeRemedyExhaustedOn', administrative, MSG_ONLY_ADMINISTRATIVE);

    /* El acto lesivo del amparo (D-78): con su fecha van el plazo y cómo se
       cuenta; si se renueva, cada cuántos días. */
    const harmfulActDate = pastDate('harmfulActDate', amparo, MSG_ONLY_AMPARO);
    const harmfulActRenews = bool('harmfulActRenews', amparo, MSG_ONLY_AMPARO);
    let harmfulActRenewalDays: number | null = null;
    let harmfulActTermDays: number | null = null;
    let harmfulActTermDayType: DayType | null = null;

    if (amparo) {
        const hasDate = isPresent(body.harmfulActDate);
        if (harmfulActRenews) {
            harmfulActRenewalDays = readPositiveInteger(body.harmfulActRenewalDays) ?? null;
            if (harmfulActRenewalDays === null) details.harmfulActRenewalDays = 'Indicá cada cuántos días se renueva el acto lesivo.';
        } else if (isPresent(body.harmfulActRenewalDays)) {
            details.harmfulActRenewalDays = 'Solo corresponde si el acto lesivo se renueva.';
        }
        if (hasDate) {
            harmfulActTermDays = readPositiveInteger(body.harmfulActTermDays) ?? null;
            if (harmfulActTermDays === null) details.harmfulActTermDays = 'Indicá el plazo para presentar el amparo.';
            const dayType = body.harmfulActTermDayType;
            if (dayType === 'BUSINESS' || dayType === 'CONSECUTIVE') harmfulActTermDayType = dayType;
            else details.harmfulActTermDayType = 'Indicá si el plazo se cuenta en días hábiles o corridos.';
        } else {
            for (const field of ['harmfulActTermDays', 'harmfulActTermDayType'] as const) {
                if (isPresent(body[field])) details[field] = 'Solo corresponde si se informa la fecha del acto lesivo.';
            }
        }
    } else if (jurisdiction !== null) {
        for (const field of ['harmfulActRenewalDays', 'harmfulActTermDays', 'harmfulActTermDayType'] as const) {
            if (isPresent(body[field])) details[field] = MSG_ONLY_AMPARO;
        }
    }

    return {
        clientDetained,
        injunctionGranted,
        harmfulActDate,
        harmfulActRenews,
        harmfulActRenewalDays,
        harmfulActTermDays,
        harmfulActTermDayType,
        administrativeRemedyExhaustedOn,
    };
}

/**
 * Intenta crear la carpeta de una causa (V4 §4, "Carpeta de la causa"). Si el
 * almacenamiento responde, queda `CREATED` con los modelos del fuero copiados,
 * y cada modelo suma un uso; si no, `ERROR`. Con `status` en `PENDING` no la
 * crea: es la de una causa registrada sin pedirla.
 */
function newFolder(stored: StoredCase, copyTemplates: boolean, status?: 'PENDING'): StoredFolder {
    // La carpeta va en la del abogado responsable al crearse (D-61).
    const lawyer = db.lawyers.find((l) => l.id === stored.responsibleLawyerId) ?? { lastName: '', firstName: '' };
    const folder = buildFolder({
        caseId: stored.id,
        path: folderPath({ lawyer, jurisdiction: stored.jurisdiction, caption: stored.caption }),
        copyTemplates,
        templates: templatesForNewCases(db.documentTemplates, stored.jurisdiction).length,
        status: status ?? (db.failures.documentStorage ? 'ERROR' : 'CREATED'),
    });
    if (folder.status === 'CREATED' && copyTemplates) {
        countTemplateCopies(stored.jurisdiction);
        // Las copias quedan en la carpeta y se leen con sus documentos (V5 §3.12).
        db.documents.push(...templateCopies(stored.id, db.documentTemplates, stored.jurisdiction, nowIso()));
    }
    return folder;
}

/**
 * El vencimiento abierto de una causa, de cualquiera de sus dos orígenes: el
 * plazo del acto procesal del estado actual o, en un amparo todavía en
 * "Iniciada", el del acto lesivo. Nunca hay dos a la vez (V4 D-82).
 */
function openDueDateOf(c: Case): string | null {
    return c.currentState.dueDate ?? c.harmfulActDeadline?.dueDate ?? null;
}

const listCases: Handler = ({ request }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const page = readPagination(request.query);
    if (!page.ok) return page.response;

    const { query } = request;
    const details: Record<string, string> = {};

    const jurisdiction = query.get('jurisdiction');
    const hasJurisdiction = jurisdiction !== null && jurisdiction !== '';
    if (hasJurisdiction && !isJurisdiction(jurisdiction)) {
        details.jurisdiction = 'No existe un fuero procesal con ese nombre.';
    }

    const lawyerId = readQueryId(query, 'responsibleLawyerId');
    if (!lawyerId.ok) details.responsibleLawyerId = MSG_NOT_INTEGER;
    const clientId = readQueryId(query, 'clientId');
    if (!clientId.ok) details.clientId = MSG_NOT_INTEGER;
    const stateId = readQueryId(query, 'proceduralStateId');
    if (!stateId.ok) details.proceduralStateId = MSG_NOT_INTEGER;

    const openDeadline = readQueryBoolean(query, 'openDeadline');
    if (!openDeadline.ok) details.openDeadline = MSG_NOT_BOOLEAN;
    const withoutActs = readQueryBoolean(query, 'withoutProceduralActs');
    if (!withoutActs.ok) details.withoutProceduralActs = MSG_NOT_BOOLEAN;

    const customState = asText(query.get('customState'));

    /* El filtro de estado del listado es una sola elección, que viaja en uno
       de tres parámetros: son excluyentes entre sí (V3 D-29). */
    const byStateId = stateId.ok && stateId.value !== undefined;
    const byCustomState = customState !== '';
    const byWithoutActs = withoutActs.ok && withoutActs.value === true;
    if (byStateId && byCustomState) {
        details.customState = 'No puede combinarse con proceduralStateId.';
    }
    if (byWithoutActs && (byStateId || byCustomState)) {
        details.withoutProceduralActs = 'No puede combinarse con proceduralStateId ni con customState.';
    }

    if (Object.keys(details).length > 0) return invalidQuery(details);

    const search = asText(query.get('search'));
    const onlyOpen = openDeadline.ok && openDeadline.value === true;

    const filtered = db.cases
        .filter((c) => c.active)
        .filter((c) => (hasJurisdiction ? c.jurisdiction === jurisdiction : true))
        // Un abogado, un cliente o un estado inexistente no es un error:
        // devuelve una colección vacía.
        .filter((c) => (lawyerId.ok && lawyerId.value !== undefined ? c.responsibleLawyerId === lawyerId.value : true))
        .filter((c) => (clientId.ok && clientId.value !== undefined ? c.clientId === clientId.value : true))
        .filter((c) => {
            const latest = latestActOf(c.id);
            const prescribed = c.prescriptionDeclaration !== null;
            // Sin actos, la causa sigue en el estado inicial, "Iniciada" (D-34).
            if (byWithoutActs) return latest === undefined && !prescribed;
            // Una causa marcada como prescripta se encuentra por "Prescripta" (V4 §3.7).
            if (byStateId) return currentStateIdOf(c) === stateId.value;
            if (byCustomState) {
                return !prescribed && latest?.customState?.toLowerCase() === customState.toLowerCase();
            }
            return true;
        })
        .map(toCase)
        // "Solo con plazo por vencer": las que tienen vencimiento, vencidas incluidas.
        .filter((c) => (onlyOpen ? openDueDateOf(c) !== null : true))
        .filter((c) =>
            search === ''
                ? true
                : (c.sacNumber !== null && contains(c.sacNumber, search)) ||
                  contains(c.caption, search) ||
                  // En los dos órdenes: "gómez, ariel" y "ariel gómez".
                  contains(`${c.client.lastName}, ${c.client.firstName}`, search) ||
                  contains(`${c.client.firstName} ${c.client.lastName}`, search),
        )
        /* Por urgencia (D-25, D-82): primero las causas con vencimiento abierto,
           del acto procesal o del acto lesivo, de la fecha más próxima a la más
           lejana —las vencidas quedan arriba—, y después las que no tienen, por
           `id`. */
        .sort((a, b) => {
            const dueA = openDueDateOf(a);
            const dueB = openDueDateOf(b);
            if (dueA !== null && dueB !== null) return dueA.localeCompare(dueB) || a.id - b.id;
            if (dueA !== null) return -1;
            if (dueB !== null) return 1;
            return a.id - b.id;
        });

    return ok(paginate(filtered, page.page, page.limit));
};

/**
 * Los estados escritos a mano que tienen hoy las causas activas: el grupo
 * "Escritos a mano en causas" del filtro de estado.
 *
 * "Iniciada" no sale de acá: no es un estado escrito a mano sino el estado
 * inicial de la causa, y el filtro lo ofrece como opción fija (V3 D-29, D-34).
 *
 * Es la única colección sin paginar: una lista corta de textos en `data`.
 */
const listCustomStates: Handler = ({ request }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const jurisdiction = request.query.get('jurisdiction');
    const hasJurisdiction = jurisdiction !== null && jurisdiction !== '';
    if (hasJurisdiction && !isJurisdiction(jurisdiction)) {
        return fail(400, ERRORS.invalidJurisdiction);
    }

    const names = db.cases
        .filter(isActiveCase)
        .filter((c) => (hasJurisdiction ? c.jurisdiction === jurisdiction : true))
        .map((c) => latestActOf(c.id)?.customState)
        .filter((name): name is string => typeof name === 'string' && name !== '');

    return ok(itemBody([...new Set(names)].sort(byText)));
};

const getCase: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);

    return ok(itemBody(toCase(stored)));
};

/* ------------------------------------------------------------------ */
/* /cases/{caseId}/procedural-acts                                     */
/* ------------------------------------------------------------------ */

const CUSTOM_STATE_MAX = 255;
const NOTES_MAX = 2000;

const MSG_STATE_NOT_ALLOWED = 'El estado procesal no pertenece al fuero de la causa o es el estado Prescripta.';
const MSG_NOTIFICATION_REQUIRED =
    'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).';

/**
 * El estado de la tabla al que un acto puede llevar la causa: vigente y del
 * fuero de la causa. Desde V4 puede ser terminal —"Archivada" es la forma de
 * cerrarla—, **salvo "Prescripta"**, que tiene su propio botón (D-69).
 * `undefined` si no sirve.
 */
function allowedTargetState(stateId: number | undefined, jurisdiction: Jurisdiction) {
    if (stateId === undefined || stateId === PRESCRIBED_STATE_ID) return undefined;
    return db.proceduralStates.find((s) => s.id === stateId && s.active && s.jurisdiction === jurisdiction);
}

/**
 * Las fechas de un acto, con las mismas reglas para registrarlo y para
 * previsualizar su vencimiento: el contrato pide que coincidan, y por eso es
 * una sola función. Devuelve los errores por campo.
 */
function actDateErrors(input: {
    jurisdiction: Jurisdiction;
    /** `true` si el estado elegido abre plazo. Uno escrito a mano nunca abre. */
    opensTerm: boolean;
    actDate: unknown;
    notificationDate: unknown;
}): Record<string, string> {
    const details: Record<string, string> = {};
    const today = todayIso();

    if (!isPresent(input.actDate)) details.actDate = 'La fecha del acto es obligatoria.';
    else if (!isIsoDate(input.actDate)) details.actDate = MSG_NOT_DATE;
    else if (input.actDate > today) details.actDate = 'No puede ser posterior a hoy.';

    const hasNotification = isPresent(input.notificationDate);
    if (input.jurisdiction !== 'ADMINISTRATIVE') {
        if (hasNotification) details.notificationDate = 'Solo corresponde al fuero administrativo.';
        return details;
    }

    if (!hasNotification) {
        // Sin notificación no hay vencimiento que calcular (RN6, D-12).
        if (input.opensTerm) details.notificationDate = MSG_NOTIFICATION_REQUIRED;
    } else if (!isIsoDate(input.notificationDate)) {
        details.notificationDate = MSG_NOT_DATE;
    } else if (
        input.notificationDate > today ||
        (isIsoDate(input.actDate) && input.notificationDate < input.actDate)
    ) {
        details.notificationDate = 'Debe estar entre la fecha del acto y hoy.';
    }
    return details;
}

const createProceduralAct: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);

    // Sólo el abogado responsable de la causa registra sus actos (V3 D-30).
    if (!isResponsibleLawyer(auth.user, stored)) return fail(403, ERRORS.forbiddenNotResponsible);

    const body = asObject(request.body);
    const details: Record<string, string> = {};

    /* El estado al que pasa la causa: uno de la tabla del fuero o uno escrito
       a mano, nunca los dos. */
    const hasStateId = isPresent(body.proceduralStateId);
    const customState = optionalText(body.customState);
    const state = hasStateId
        ? allowedTargetState(readBodyId(body.proceduralStateId), stored.jurisdiction)
        : undefined;

    if (hasStateId && customState !== null) {
        details.customState = 'Debe enviarse proceduralStateId o customState, no ambos.';
    } else if (hasStateId) {
        if (!state) details.proceduralStateId = MSG_STATE_NOT_ALLOWED;
    } else if (customState === null) {
        details.proceduralStateId = 'Debe indicarse el estado procesal al que pasa la causa.';
    } else if (customState.length > CUSTOM_STATE_MAX) {
        details.customState = `Puede tener hasta ${CUSTOM_STATE_MAX} caracteres.`;
    } else if (customState.toLowerCase() === INITIAL_STATE_NAME.toLowerCase()) {
        // El estado inicial no puede ser destino de un acto (D-34).
        details.customState = `"${INITIAL_STATE_NAME}" es el estado inicial y no puede ser destino de un acto.`;
    } else if (
        db.proceduralStates.some(
            (s) =>
                s.active &&
                s.jurisdiction === stored.jurisdiction &&
                s.name.toLowerCase() === customState.toLowerCase(),
        )
    ) {
        // Si el texto es un estado de la tabla, corresponde mandar su id.
        details.customState = 'Coincide con un estado de la tabla del fuero: enviá su proceduralStateId.';
    }

    Object.assign(
        details,
        actDateErrors({
            jurisdiction: stored.jurisdiction,
            opensTerm: (state?.timeLimitDays ?? 0) > 0,
            actDate: body.actDate,
            notificationDate: body.notificationDate,
        }),
    );

    const notes = optionalText(body.notes);
    if (notes !== null && notes.length > NOTES_MAX) {
        details.notes = `Puede tener hasta ${NOTES_MAX} caracteres.`;
    }

    const actDate = isIsoDate(body.actDate) ? body.actDate : null;
    const notificationDate = isIsoDate(body.notificationDate) ? body.notificationDate : null;

    let manualDueDate: string | null = null;
    if (isPresent(body.manualDueDate) && state?.terminal) {
        // Un estado terminal no abre plazo: no hay vencimiento que ajustar (D-69).
        details.manualDueDate = 'Un estado terminal no abre plazo: no admite un vencimiento manual.';
    } else if (isPresent(body.manualDueDate)) {
        const countsFrom =
            stored.jurisdiction === 'ADMINISTRATIVE' && notificationDate ? notificationDate : actDate;
        if (!isIsoDate(body.manualDueDate)) details.manualDueDate = MSG_NOT_DATE;
        else if (countsFrom !== null && body.manualDueDate < countsFrom) {
            details.manualDueDate = 'No puede ser anterior a la fecha desde la que corre el plazo.';
        } else manualDueDate = body.manualDueDate;
    }

    if (Object.keys(details).length > 0) return validationError(details);

    if (isInTerminalState(stored.id)) return fail(422, ERRORS.caseInTerminalState);

    const act: StoredAct = {
        id: db.nextProceduralActId,
        caseId: stored.id,
        proceduralStateId: state?.id ?? null,
        customState: state ? null : customState,
        actDate: actDate as string,
        notificationDate,
        notes,
        /* Los días y el tipo de día de la tabla se copian al acto: si después
           cambia el plazo del estado, este vencimiento no se recalcula (D-08). */
        deadline: buildActDeadline({
            state: state ?? null,
            jurisdiction: stored.jurisdiction,
            actDate: actDate as string,
            notificationDate,
            manualDueDate,
        }),
        registeredById: auth.user.id,
        registeredAt: nowIso(),
        lastModifiedById: null,
        lastModifiedAt: null,
    };
    db.nextProceduralActId += 1;
    db.proceduralActs.push(act);

    /* El acto se aplica al registrarse, sin confirmación (D-13). No hay nada
       que escribir en la causa: su estado y su vencimiento salen del acto de
       fecha más reciente, así que un acto viejo no la hace retroceder (D-14).
       Si era el primero, la causa deja el estado inicial (D-34). */
    return created(itemBody(toProceduralAct(act)));
};

/**
 * El vencimiento que tendría un acto, sin registrarlo. Existe para que el
 * cálculo viva en un solo lugar: lo que se ve antes de guardar es lo que se
 * guarda (V3 D-20).
 *
 * No aplica a estados escritos a mano, que no tienen plazo de tabla, y el
 * ajuste manual tampoco pasa por acá.
 */
const previewDeadline: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);

    // Igual que el registro al que sirve: sólo el abogado responsable (D-30).
    if (!isResponsibleLawyer(auth.user, stored)) return fail(403, ERRORS.forbiddenNotResponsible);

    const { query } = request;
    const details: Record<string, string> = {};

    const stateId = readQueryId(query, 'proceduralStateId');
    const state = stateId.ok ? allowedTargetState(stateId.value, stored.jurisdiction) : undefined;
    if (!stateId.ok) details.proceduralStateId = MSG_NOT_INTEGER;
    else if (stateId.value === undefined) details.proceduralStateId = 'Es obligatorio.';
    else if (!state) details.proceduralStateId = MSG_STATE_NOT_ALLOWED;

    const actDate = query.get('actDate');
    const notificationDate = query.get('notificationDate');
    Object.assign(
        details,
        actDateErrors({
            jurisdiction: stored.jurisdiction,
            opensTerm: (state?.timeLimitDays ?? 0) > 0,
            actDate,
            notificationDate,
        }),
    );

    if (Object.keys(details).length > 0 || !state) return invalidQuery(details);

    const countsFrom =
        stored.jurisdiction === 'ADMINISTRATIVE' && isIsoDate(notificationDate)
            ? notificationDate
            : (actDate as string);
    const dueDate = computeDueDate(countsFrom, state.timeLimitDays, state.dayType);

    const preview: DeadlinePreview = {
        proceduralStateId: state.id,
        timeLimitDays: state.timeLimitDays,
        dayType: state.dayType,
        countsFrom,
        dueDate,
        businessDaysRemaining: dueDate === null ? null : businessDaysUntil(dueDate),
    };
    return ok(itemBody(preview));
};

/* ------------------------------------------------------------------ */
/* Helpers de los recursos del Sprint 3 (V4)                           */
/* ------------------------------------------------------------------ */

const NAME_TEXT_MAX = 255;
const MSG_NOT_DOCX = 'El archivo tiene que ser .docx.';

/** El primer valor de un campo de texto del formulario, recortado. */
function formText(request: MockRequest, name: string): string {
    return (request.form?.fields[name]?.[0] ?? '').trim();
}

/** El archivo del campo `file`, si vino en un `multipart/form-data`. */
function formFile(request: MockRequest) {
    return request.form?.files.file;
}

/**
 * La fecha de un cuerpo que no puede ser futura: la de un acto interruptivo,
 * la de la prescripción. Devuelve el mensaje de error, o `undefined`.
 */
function pastDateError(value: unknown, required: string): string | undefined {
    if (!isPresent(value)) return required;
    if (!isIsoDate(value)) return MSG_NOT_DATE;
    if (value > todayIso()) return 'No puede ser posterior a hoy.';
    return undefined;
}

/** Un texto libre opcional con un máximo. */
function maxLengthError(value: string | null, max: number): string | undefined {
    return value !== null && value.length > max ? `Puede tener hasta ${max} caracteres.` : undefined;
}

/* ------------------------------------------------------------------ */
/* /cases/{caseId}/prescription                                        */
/* ------------------------------------------------------------------ */

/**
 * Marca una causa penal como prescripta (HU33). Es una acción manual, como la
 * resuelve el prototipo (V4 D-52, C-23): la causa pasa a "Prescripta", se
 * cierran sus plazos y deja de ser activa. No se revierte (D-54).
 *
 * No exige que el plazo calculado esté cumplido: la prescripción la declara el
 * tribunal.
 */
const declarePrescription: Handler = ({ request, params }) => {
    const auth = requireAdministratorOrLawyer(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const body = asObject(request.body);
    const details: Record<string, string> = {};
    const dateError = pastDateError(body.prescriptionDate, 'La fecha de la prescripción es obligatoria.');
    if (dateError) details.prescriptionDate = dateError;
    const resolution = asText(body.resolution);
    if (resolution === '') details.resolution = 'La resolución que declara la prescripción es obligatoria.';
    else if (resolution.length > NAME_TEXT_MAX) details.resolution = `Puede tener hasta ${NAME_TEXT_MAX} caracteres.`;
    const grounds = optionalText(body.grounds);
    const groundsError = maxLengthError(grounds, NOTES_MAX);
    if (groundsError) details.grounds = groundsError;
    if (Object.keys(details).length > 0) return validationError(details);

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);
    if (!canDeclarePrescription(auth.user, stored)) return fail(403, ERRORS.forbiddenNotResponsiblePrescription);

    if (stored.jurisdiction !== 'CRIMINAL') return fail(422, ERRORS.prescriptionNotApplicable);
    // Una causa penal sin calificación legal no prescribe (V4 D-74).
    if (stored.qualifications.length === 0) return fail(422, ERRORS.prescriptionWithoutQualifications);
    if (isInTerminalState(stored.id)) return fail(422, ERRORS.caseInTerminalStateOperation);

    stored.prescriptionDeclaration = {
        prescriptionDate: body.prescriptionDate as string,
        resolution,
        grounds,
        registeredById: auth.user.id,
        registeredAt: nowIso(),
    };
    // D-113, CA-33.17: declara las calificaciones que faltaban; las declaradas conservan la suya.
    for (const q of stored.qualifications) {
        if (!q.prescriptionDeclaration) q.prescriptionDeclaration = { ...stored.prescriptionDeclaration };
    }
    // Devuelve la causa entera: cambian varias partes a la vez (D-54).
    return ok(itemBody(toCase(stored)));
};

/* ------------------------------------------------------------------ */
/* /cases/{caseId}/legal-qualifications/{legalQualificationId}/prescription */
/* ------------------------------------------------------------------ */

/**
 * D-113: declara prescripta una calificación de la causa. La causa sigue
 * abierta por las demás; si era la última sin declarar, pasa a "Prescripta"
 * con esa misma declaración. Mismo cuerpo y mismos permisos que la causa
 * entera. Orden del contrato: 404 causa → 403 → 422 fuero → 404 calificación →
 * 422 terminal → 422 ya declarada → 400 de los datos.
 */
const declareQualificationPrescription: Handler = ({ request, params }) => {
    const auth = requireAdministratorOrLawyer(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);
    const qualificationId = readRouteId(params, 'legalQualificationId');
    if (qualificationId === undefined) {
        return fail(400, errorBody('INVALID_PATH_PARAMETER', 'El identificador de la calificación legal no es válido.', {
            legalQualificationId: 'Debe ser un número entero válido.',
        }));
    }

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);
    if (!canDeclarePrescription(auth.user, stored)) {
        return fail(403, ERRORS.forbiddenNotResponsibleQualificationPrescription);
    }
    if (stored.jurisdiction !== 'CRIMINAL') return fail(422, ERRORS.prescriptionNotApplicable);
    const qualification = stored.qualifications.find((q) => q.legalQualificationId === qualificationId);
    if (!qualification) return fail(404, ERRORS.legalQualificationNotInCase);
    if (isInTerminalState(stored.id)) return fail(422, ERRORS.caseInTerminalStateOperation);
    if (qualification.prescriptionDeclaration) return fail(422, ERRORS.qualificationAlreadyPrescribed);

    const body = asObject(request.body);
    const details: Record<string, string> = {};
    const dateError = pastDateError(body.prescriptionDate, 'La fecha de la prescripción es obligatoria.');
    if (dateError) details.prescriptionDate = dateError;
    const resolution = asText(body.resolution);
    if (resolution === '') details.resolution = 'La resolución que declara la prescripción es obligatoria.';
    else if (resolution.length > NAME_TEXT_MAX) details.resolution = `Puede tener hasta ${NAME_TEXT_MAX} caracteres.`;
    const grounds = optionalText(body.grounds);
    const groundsError = maxLengthError(grounds, NOTES_MAX);
    if (groundsError) details.grounds = groundsError;
    if (Object.keys(details).length > 0) return validationError(details);

    qualification.prescriptionDeclaration = {
        prescriptionDate: body.prescriptionDate as string,
        resolution,
        grounds,
        registeredById: auth.user.id,
        registeredAt: nowIso(),
    };
    // La última sin declarar cierra la causa (CA-33.4).
    if (stored.qualifications.every((q) => q.prescriptionDeclaration)) {
        stored.prescriptionDeclaration = { ...qualification.prescriptionDeclaration };
    }
    return ok(itemBody(toCase(stored)));
};

/* ------------------------------------------------------------------ */
/* /cases/{caseId}/folder                                              */
/* ------------------------------------------------------------------ */

/**
 * Crea la carpeta de una causa que no la tiene (`null` o `PENDING`), reintenta
 * una con `ERROR` o
 * copia los modelos que faltaron (V4 §3.7). Es idempotente: sobre una carpeta
 * completa no hace nada y responde `200` con ella.
 *
 * Con `db.failures.documentStorage` el almacenamiento "no responde": la
 * carpeta queda en `ERROR` y responde `502`. Sobre una carpeta `CREATING` no
 * hace nada: responde `200` con ella tal como está.
 */
const createCaseFolder: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const body = asObject(request.body);
    if (body.copyTemplates !== undefined && typeof body.copyTemplates !== 'boolean') {
        return validationError({ copyTemplates: MSG_NOT_BOOL_FIELD });
    }
    const copyTemplates = body.copyTemplates !== false;

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);
    if (!canOperateCase(auth.user, stored)) return fail(403, ERRORS.forbiddenNotResponsibleFolder);

    const folder = stored.folder;
    if (folder === null || folder.status === 'PENDING' || folder.status === 'ERROR') {
        stored.folder = newFolder(stored, copyTemplates);
        if (stored.folder.status === 'ERROR') return fail(502, ERRORS.documentStorageUnavailable);
    } else if (folder.status === 'CREATED' && folder.templatesPending > 0 && copyTemplates) {
        if (db.failures.documentStorage) return fail(502, ERRORS.documentStorageUnavailable);
        folder.templatesCopied += folder.templatesPending;
        folder.templatesPending = 0;
        folder.copyTemplates = true;
        const copies = templateCopies(stored.id, db.documentTemplates, stored.jurisdiction, nowIso());
        db.documents.push(...copies.filter((copy) => !db.documents.some((d) => d.id === copy.id)));
    }

    /* Una carpeta que quedó con la carátula o el responsable anteriores porque
       Drive no respondió se corrige al reintentar (V5 D-104). */
    if (stored.folder?.status === 'CREATED' && !db.failures.documentStorage) {
        stored.folder.path = expectedFolderPath(stored);
    }

    return ok(itemBody(toFolder(stored.folder as StoredFolder)));
};

/* ------------------------------------------------------------------ */
/* /cases/{caseId}/interruptive-acts                                   */
/* ------------------------------------------------------------------ */

/**
 * Registra un acto interruptivo (HU31). Reinicia la prescripción de todas las
 * calificaciones de la causa desde su fecha (D-49); no mueve el estado ni abre
 * plazos (D-48). Lo registra sólo el abogado responsable, como los actos
 * procesales, y por eso sigue su mismo orden: `404` de la causa, `403`, `400`
 * del cuerpo y recién después los `422`.
 */
const createInterruptiveAct: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);
    if (!isResponsibleLawyer(auth.user, stored)) {
        return fail(403, ERRORS.forbiddenNotResponsibleInterruptive);
    }

    const body = asObject(request.body);
    const details: Record<string, string> = {};
    const name = asText(body.name);
    if (name === '') details.name = 'El acto interruptivo es obligatorio.';
    else if (name.length > NAME_TEXT_MAX) details.name = `Puede tener hasta ${NAME_TEXT_MAX} caracteres.`;
    const dateError = pastDateError(body.actDate, 'La fecha del acto es obligatoria.');
    if (dateError) details.actDate = dateError;
    const notes = optionalText(body.notes);
    const notesError = maxLengthError(notes, NOTES_MAX);
    if (notesError) details.notes = notesError;
    if (Object.keys(details).length > 0) return validationError(details);

    // Sólo el penal computa prescripción (D-50).
    if (stored.jurisdiction !== 'CRIMINAL') return fail(422, ERRORS.prescriptionNotApplicable);
    if (isInTerminalState(stored.id)) return fail(422, ERRORS.caseInTerminalStateOperation);

    const act = {
        id: db.nextInterruptiveActId,
        caseId: stored.id,
        name,
        actDate: body.actDate as string,
        notes,
        registeredById: auth.user.id,
        registeredAt: nowIso(),
    };
    db.nextInterruptiveActId += 1;
    db.interruptiveActs.push(act);

    /* No se escribe nada en la causa: la prescripción se calcula en cada
       lectura, así que un acto viejo no la hace retroceder (rige el más
       reciente). */
    return created(itemBody(toInterruptiveAct(act)));
};

/**
 * Los actos interruptivos de una causa, del más reciente al más antiguo: el
 * primero es el que rige (V4 §3.9). Una causa que no es penal devuelve la
 * lista vacía, no un error.
 */
const listInterruptiveActs: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const page = readPagination(request.query);
    if (!page.ok) return page.response;

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);

    return ok(paginate(interruptiveActsOf(stored.id).map(toInterruptiveAct), page.page, page.limit));
};

/* ------------------------------------------------------------------ */
/* Consulta de actos y línea de vida (HU27)                            */
/* ------------------------------------------------------------------ */

/** Del más reciente al más antiguo por fecha; a igual fecha, el último registrado. */
function byDateDesc(a: { date: string; registeredAt: string }, b: { date: string; registeredAt: string }): number {
    return b.date.localeCompare(a.date) || b.registeredAt.localeCompare(a.registeredAt);
}

/** Los actos procesales de una causa, paginados y del más reciente al más antiguo (V4 §3.8). */
const listProceduralActs: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const page = readPagination(request.query);
    if (!page.ok) return page.response;

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);

    const acts = actsOf(stored.id)
        .slice()
        .sort((a, b) => b.actDate.localeCompare(a.actDate) || b.id - a.id)
        .map(toProceduralAct);
    return ok(paginate(acts, page.page, page.limit));
};

/** Un acto procesal de la causa. El de otra causa es `404`, como uno inexistente. */
const getProceduralAct: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);
    const actId = readRouteId(params, 'actId');
    if (actId === undefined) return fail(400, ERRORS.invalidActId);

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);

    const act = db.proceduralActs.find((a) => a.id === actId && a.caseId === stored.id);
    if (!act) return fail(404, ERRORS.proceduralActNotFound);
    return ok(itemBody(toProceduralAct(act)));
};

/**
 * La línea de vida de la causa (HU27, D-85): actos procesales, actos
 * interruptivos y el pase a "Prescripta", intercalados y sin paginar. El acto
 * `current` es el que define el estado actual; en una causa marcada como
 * prescripta, ninguno.
 */
const getCaseTimeline: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);

    const c = toCase(stored);
    const currentActId = c.currentState.proceduralActId;
    const interruptive = interruptiveActsOf(stored.id);
    const governingDate = c.prescription?.lastInterruptiveActDate ?? null;
    const governingActId = interruptive.find((act) => act.actDate === governingDate)?.id ?? null;

    const entries: (TimelineEntry & { registeredAt: string })[] = [
        ...actsOf(stored.id).map((act) => ({
            type: 'PROCEDURAL_ACT' as const,
            date: act.actDate,
            current: act.id === currentActId,
            proceduralAct: toProceduralAct(act),
            registeredAt: act.registeredAt,
        })),
        ...interruptive.map((act) => ({
            type: 'INTERRUPTIVE_ACT' as const,
            date: act.actDate,
            // D-113: rige el acto del que cuenta `prescription`; la lista viene de la más
            // reciente a la más antigua, así que a igual fecha rige el primero.
            governsPrescription: governingActId === act.id,
            interruptiveAct: toInterruptiveAct(act),
            registeredAt: act.registeredAt,
        })),
        ...c.legalQualifications.flatMap((q) =>
            q.prescriptionDeclaration
                ? [{
                      type: 'QUALIFICATION_PRESCRIPTION_DECLARATION' as const,
                      date: q.prescriptionDeclaration.prescriptionDate,
                      legalQualification: { id: q.id, name: q.name },
                      prescriptionDeclaration: q.prescriptionDeclaration,
                      registeredAt: q.prescriptionDeclaration.registeredAt,
                  }]
                : [],
        ),
        ...(c.prescriptionDeclaration
            ? [{
                  type: 'PRESCRIPTION_DECLARATION' as const,
                  date: c.prescriptionDeclaration.prescriptionDate,
                  prescriptionDeclaration: c.prescriptionDeclaration,
                  registeredAt: c.prescriptionDeclaration.registeredAt,
              }]
            : []),
    ];

    const data: TimelineEntry[] = entries.sort(byDateDesc).map((entry) => {
        const { registeredAt, ...rest } = entry;
        void registeredAt;
        return rest;
    });
    return ok({ data });
};

/* ------------------------------------------------------------------ */
/* /document-templates                                                 */
/* ------------------------------------------------------------------ */

const TEMPLATE_NAME_MAX = 150;
const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** El nombre de un modelo es único, sin distinguir mayúsculas (V4 D-71). */
function templateNameTaken(name: string): boolean {
    return db.documentTemplates.some((t) => t.name.toLowerCase() === name.toLowerCase());
}

/** El modelo vigente con ese id, o `undefined`: uno dado de baja no existe (CA-35.7). */
function findTemplate(id: number): StoredDocumentTemplate | undefined {
    return db.documentTemplates.find((t) => t.id === id && t.active);
}

/**
 * Registra un modelo formal con su archivo (HU34), en `multipart/form-data`.
 * El alta es atómica (CA-34.7): con el almacenamiento caído no se escribe nada
 * y responde `502`.
 */
const createDocumentTemplate: Handler = ({ request }) => {
    const auth = requireAdministratorOrLawyer(request);
    if (!auth.ok) return auth.response;

    const file = formFile(request);
    if (file && file.size > MAX_FILE_BYTES) return fail(413, ERRORS.fileTooLarge);

    const details: Record<string, string> = {};

    const name = formText(request, 'name');
    if (name === '') details.name = 'El nombre del modelo es obligatorio.';
    else if (name.length > TEMPLATE_NAME_MAX) details.name = `Puede tener hasta ${TEMPLATE_NAME_MAX} caracteres.`;

    // Se repite una vez por fuero; "Todos los fueros" manda los tres (D-55).
    const jurisdictions = (request.form?.fields.jurisdictions ?? []).map((j) => j.trim()).filter(Boolean);
    if (jurisdictions.length === 0) details.jurisdictions = 'Elegí al menos un fuero.';
    else if (!jurisdictions.every(isJurisdiction)) details.jurisdictions = 'No existe un fuero procesal con ese nombre.';
    else if (new Set(jurisdictions).size !== jurisdictions.length) details.jurisdictions = 'No puede repetirse un fuero.';

    const copyRaw = formText(request, 'copyToNewCases');
    if (copyRaw !== '' && copyRaw !== 'true' && copyRaw !== 'false') details.copyToNewCases = MSG_NOT_BOOLEAN;

    if (!file) details.file = 'El archivo del modelo es obligatorio.';
    else if (!/\.docx$/i.test(file.name)) details.file = MSG_NOT_DOCX;

    if (Object.keys(details).length > 0) return validationError(details);

    if (templateNameTaken(name)) return fail(409, ERRORS.documentTemplateNameTaken);
    if (db.failures.documentStorage) return fail(502, ERRORS.documentStorageUnavailable);

    const template: StoredDocumentTemplate = {
        id: db.nextDocumentTemplateId,
        name,
        jurisdictions: jurisdictions as Jurisdiction[],
        fileName: (file as { name: string }).name,
        copyToNewCases: copyRaw !== 'false',
        // La última versión es el alta (V4 §3.10).
        lastVersionAt: nowIso(),
        lastVersionById: auth.user.id,
        usageCount: 0,
        active: true,
    };
    db.nextDocumentTemplateId += 1;
    db.documentTemplates.push(template);

    return created(itemBody(toDocumentTemplate(template)));
};

/**
 * Los modelos vigentes, por nombre (CA-35.3). Un modelo de varios fueros sale
 * en el filtro de cada uno, y una sola vez sin filtro.
 */
const listDocumentTemplates: Handler = ({ request }) => {
    const auth = requireAdministratorOrLawyer(request);
    if (!auth.ok) return auth.response;

    const page = readPagination(request.query);
    if (!page.ok) return page.response;

    const jurisdiction = request.query.get('jurisdiction');
    const hasJurisdiction = jurisdiction !== null && jurisdiction !== '';
    if (hasJurisdiction && !isJurisdiction(jurisdiction)) return fail(400, ERRORS.invalidJurisdiction);

    const copy = readQueryBoolean(request.query, 'copyToNewCases');
    if (!copy.ok) return invalidQuery({ copyToNewCases: MSG_NOT_BOOLEAN });
    const onlyCopied = copy.value === true;

    const filtered = db.documentTemplates
        .filter((t) => t.active)
        .filter((t) => (hasJurisdiction ? t.jurisdictions.includes(jurisdiction as Jurisdiction) : true))
        .filter((t) => (onlyCopied ? t.copyToNewCases : true))
        .sort((a, b) => byText(a.name, b.name) || a.id - b.id)
        .map(toDocumentTemplate);

    return ok(paginate(filtered, page.page, page.limit));
};

const getDocumentTemplate: Handler = ({ request, params }) => {
    const auth = requireAdministratorOrLawyer(request);
    if (!auth.ok) return auth.response;

    const id = readRouteId(params, 'templateId');
    if (id === undefined) return fail(400, ERRORS.invalidDocumentTemplateId);

    const template = findTemplate(id);
    if (!template) return fail(404, ERRORS.documentTemplateNotFound);

    return ok(itemBody(toDocumentTemplate(template)));
};

/**
 * El `.docx` del modelo (CA-35.6). Es la única respuesta exitosa que no es
 * JSON; el contenido es un texto de relleno, que alcanza para que el cliente
 * reciba un archivo con su nombre y su tipo.
 */
const downloadDocumentTemplate: Handler = ({ request, params }) => {
    const auth = requireAdministratorOrLawyer(request);
    if (!auth.ok) return auth.response;

    const id = readRouteId(params, 'templateId');
    if (id === undefined) return fail(400, ERRORS.invalidDocumentTemplateId);

    const template = findTemplate(id);
    if (!template) return fail(404, ERRORS.documentTemplateNotFound);

    if (db.failures.documentStorage) return fail(502, ERRORS.documentStorageUnavailable);

    return {
        status: 200,
        body: null,
        file: {
            content: `Modelo formal del estudio: ${template.name}`,
            contentType: DOCX_CONTENT_TYPE,
            fileName: template.fileName,
        },
    };
};

/* ------------------------------------------------------------------ */
/* /dashboards                                                         */
/* ------------------------------------------------------------------ */

/** Días hábiles que cuentan como "próximos" (V4 D-66, CA-41.2). */
const DUE_SOON_BUSINESS_DAYS = 5;

/** Las causas activas del alcance del tablero, ya serializadas (CA-41.6). */
function activeCasesWhere(predicate: (stored: StoredCase) => boolean): Case[] {
    return db.cases.filter(isActiveCase).filter(predicate).map(toCase);
}

const lawyerRef = (c: Case) => ({
    id: c.responsibleLawyer.id,
    lastName: c.responsibleLawyer.lastName,
    firstName: c.responsibleLawyer.firstName,
});

/**
 * El vencimiento abierto de la causa en un tablero: el del acto procesal del
 * estado actual o, en un amparo en "Iniciada", el del acto lesivo. Una causa
 * tiene a lo sumo uno (V4 §3.11).
 */
function openDeadlineOf(c: Case): { kind: DeadlineKind; dueDate: string; businessDaysRemaining: number } | null {
    if (c.currentState.dueDate !== null && c.currentState.businessDaysRemaining !== null) {
        return {
            kind: 'PROCEDURAL_ACT',
            dueDate: c.currentState.dueDate,
            businessDaysRemaining: c.currentState.businessDaysRemaining,
        };
    }
    if (c.harmfulActDeadline) {
        return {
            kind: 'HARMFUL_ACT',
            dueDate: c.harmfulActDeadline.dueDate,
            businessDaysRemaining: c.harmfulActDeadline.businessDaysRemaining,
        };
    }
    return null;
}

function summaryOf(cases: Case[]): DashboardSummary {
    const remaining = cases
        .map((c) => openDeadlineOf(c)?.businessDaysRemaining)
        .filter((n): n is number => n !== undefined);
    return {
        dueToday: remaining.filter((n) => n === 0).length,
        overdue: remaining.filter((n) => n < 0).length,
        dueSoon: remaining.filter((n) => n >= 1 && n <= DUE_SOON_BUSINESS_DAYS).length,
        activeCases: cases.length,
    };
}

/** Los plazos abiertos, por urgencia: los vencidos primero (V4 §3.11). */
function deadlinesOf(cases: Case[]): DashboardDeadline[] {
    return cases
        .flatMap((c) => {
            const deadline = openDeadlineOf(c);
            if (!deadline) return [];
            return [{
                caseId: c.id,
                kind: deadline.kind,
                sacNumber: c.sacNumber,
                caption: c.caption,
                jurisdiction: c.jurisdiction,
                currentStateName: c.currentState.name,
                responsibleLawyer: lawyerRef(c),
                dueDate: deadline.dueDate,
                businessDaysRemaining: deadline.businessDaysRemaining,
            }];
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.caseId - b.caseId);
}

/** Las causas con el 70 % o más de su prescripción, primero la que prescribe antes (HU32). */
function prescriptionAlertsOf(cases: Case[]): DashboardPrescriptionAlert[] {
    return cases
        .filter((c) => c.prescription?.alert === true)
        .sort((a, b) => (a.prescription?.expiresOn ?? '').localeCompare(b.prescription?.expiresOn ?? '') || a.id - b.id)
        .map((c) => {
            const p = c.prescription as NonNullable<Case['prescription']>;
            return {
                caseId: c.id,
                sacNumber: c.sacNumber,
                caption: c.caption,
                responsibleLawyer: lawyerRef(c),
                legalQualificationName: p.legalQualificationName,
                startsOn: p.startsOn,
                expiresOn: p.expiresOn,
                elapsedPercentage: p.elapsedPercentage,
                expired: p.expired,
            };
        });
}

/**
 * "Causas para impulsar": activas y sin ningún vencimiento abierto, ni del
 * acto procesal ni del acto lesivo (CA-41.4). Primero las
 * que no tienen ninguna actuación y después las que llevan más tiempo sin
 * movimiento. La última actuación es el acto procesal o interruptivo más
 * reciente.
 */
function casesToAdvanceOf(cases: Case[]): DashboardCaseToAdvance[] {
    const today = todayIso();
    return cases
        .filter((c) => openDeadlineOf(c) === null)
        .map((c) => {
            const dates = [latestActOf(c.id)?.actDate, interruptiveActsOf(c.id)[0]?.actDate]
                .filter((d): d is string => typeof d === 'string')
                .sort();
            const lastActDate = dates.at(-1) ?? null;
            return {
                caseId: c.id,
                sacNumber: c.sacNumber,
                caption: c.caption,
                jurisdiction: c.jurisdiction,
                currentStateName: c.currentState.name,
                lastActDate,
                daysSinceLastAct: lastActDate === null ? null : calendarDaysBetween(lastActDate, today),
            };
        })
        .sort((a, b) => {
            if (a.daysSinceLastAct === null && b.daysSinceLastAct === null) return a.caseId - b.caseId;
            if (a.daysSinceLastAct === null) return -1;
            if (b.daysSinceLastAct === null) return 1;
            return b.daysSinceLastAct - a.daysSinceLastAct || a.caseId - b.caseId;
        });
}

/**
 * "Mi día" (HU41): las causas de las que el usuario es responsable, por su
 * ficha. No recibe parámetros y no deja ver el de otro abogado (V4 D-63).
 */
const lawyerDashboard: Handler = ({ request }) => {
    const auth = requireRole(request, 'LAWYER');
    if (!auth.ok) return auth.response;

    const lawyer = db.lawyers.find((l) => l.id === auth.user.lawyerId);
    if (!lawyer) return fail(403, forbiddenFor('LAWYER'));

    const cases = activeCasesWhere((c) => c.responsibleLawyerId === lawyer.id);
    const dashboard: LawyerDashboard = {
        date: todayIso(),
        lawyer: { id: lawyer.id, lastName: lawyer.lastName, firstName: lawyer.firstName },
        summary: summaryOf(cases),
        deadlines: deadlinesOf(cases),
        prescriptionAlerts: prescriptionAlertsOf(cases),
        casesToAdvance: casesToAdvanceOf(cases),
    };
    return ok(itemBody(dashboard));
};

/**
 * "Estudio" (HU42): toda la cartera, con el responsable de cada plazo. Los
 * filtros por abogado y por urgencia los aplica el cliente sobre `deadlines`.
 */
const administratorDashboard: Handler = ({ request }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const cases = activeCasesWhere(() => true);
    const deadlines = deadlinesOf(cases);

    const team: DashboardTeamMember[] = db.lawyers
        .filter((l) => l.active)
        .map((lawyer) => {
            const own = deadlines.filter((d) => d.responsibleLawyer.id === lawyer.id).map((d) => d.businessDaysRemaining);
            return {
                lawyer: { id: lawyer.id, lastName: lawyer.lastName, firstName: lawyer.firstName },
                activeCases: cases.filter((c) => c.responsibleLawyer.id === lawyer.id).length,
                openDeadlines: {
                    overdue: own.filter((n) => n < 0).length,
                    dueToday: own.filter((n) => n === 0).length,
                    dueSoon: own.filter((n) => n >= 1 && n <= DUE_SOON_BUSINESS_DAYS).length,
                    later: own.filter((n) => n > DUE_SOON_BUSINESS_DAYS).length,
                },
            };
        })
        // Por urgencia; a igualdad, por nombre.
        .sort(
            (a, b) =>
                b.openDeadlines.overdue - a.openDeadlines.overdue ||
                b.openDeadlines.dueToday - a.openDeadlines.dueToday ||
                b.openDeadlines.dueSoon - a.openDeadlines.dueSoon ||
                byText(a.lawyer.lastName, b.lawyer.lastName) ||
                byText(a.lawyer.firstName, b.lawyer.firstName),
        );

    const dashboard: AdministratorDashboard = {
        date: todayIso(),
        summary: summaryOf(cases),
        // Siempre los tres fueros, aunque alguno no tenga causas.
        casesByJurisdiction: JURISDICTIONS.map((jurisdiction) => ({
            jurisdiction,
            activeCases: cases.filter((c) => c.jurisdiction === jurisdiction).length,
        })),
        deadlines,
        prescriptionAlerts: prescriptionAlertsOf(cases),
        team,
    };
    return ok(itemBody(dashboard));
};

/* ------------------------------------------------------------------ */
/* PATCH y DELETE /cases/{caseId} (V5, HU19 y HU21)                    */
/* ------------------------------------------------------------------ */

/** Lo que `PATCH /cases/{caseId}` deja cambiar (V5 §3.7). Todo lo demás es `400`. */
const CASE_PATCH_FIELDS = [
    'sacNumber', 'caption', 'court', 'instructorName', 'tribunalPhone', 'instructorExtension',
    'proceduralRole', 'legalQualifications', 'clientDetained', 'counterparty',
    'subjectMatter', 'injunctionGranted', 'harmfulActDate', 'harmfulActRenews',
    'harmfulActRenewalDays', 'harmfulActTermDays', 'harmfulActTermDayType',
    'administrativeRemedyExhaustedOn', 'courtFeePaid', 'responsibleLawyerId', 'startDate',
] as const;

/** Los campos que son de uno o dos fueros, con el mensaje para otro fuero. */
const CASE_FIELD_JURISDICTIONS: Record<string, { only: Jurisdiction[]; message: string }> = {
    legalQualifications: { only: ['CRIMINAL'], message: MSG_ONLY_CRIMINAL },
    clientDetained: { only: ['CRIMINAL'], message: MSG_ONLY_CRIMINAL },
    counterparty: { only: ['ADMINISTRATIVE', 'AMPARO'], message: MSG_NOT_CRIMINAL },
    subjectMatter: { only: ['ADMINISTRATIVE', 'AMPARO'], message: MSG_NOT_CRIMINAL },
    injunctionGranted: { only: ['AMPARO'], message: MSG_ONLY_AMPARO },
    harmfulActDate: { only: ['AMPARO'], message: MSG_ONLY_AMPARO },
    harmfulActRenews: { only: ['AMPARO'], message: MSG_ONLY_AMPARO },
    harmfulActRenewalDays: { only: ['AMPARO'], message: MSG_ONLY_AMPARO },
    harmfulActTermDays: { only: ['AMPARO'], message: MSG_ONLY_AMPARO },
    harmfulActTermDayType: { only: ['AMPARO'], message: MSG_ONLY_AMPARO },
    administrativeRemedyExhaustedOn: { only: ['ADMINISTRATIVE'], message: MSG_ONLY_ADMINISTRATIVE },
};

const MSG_NOT_MODIFIABLE = 'No es un dato modificable de la causa.';
const MSG_NOT_TEXT = 'Debe ser un texto.';
const MSG_NOT_EMPTY = 'No puede quedar vacío.';

/**
 * Modifica una causa (HU19, V5 §3.7). La modifica quien opera la causa: el
 * responsable, un `ADMINISTRATOR` o una `SECRETARY` (D-110).
 *
 * Como en los actos procesales, el `404` de la causa va antes que el `403` y
 * que el `400` del cuerpo: qué datos admite depende de su fuero.
 *
 * Ni el fuero ni el cliente se modifican (D-95, D-111). La carpeta
 * sigue a la causa (D-104): se renombra con la carátula y se mueve con el
 * responsable, salvo que Drive no responda; ahí la causa se guarda igual y la
 * carpeta queda donde estaba.
 */
const updateCase: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);
    if (!canOperateCase(auth.user, stored)) return fail(403, ERRORS.forbiddenNotResponsibleCaseUpdate);

    const body = asObject(request.body);
    const keys = Object.keys(body);
    if (keys.length === 0) return validationError({ body: 'Debe enviarse al menos un campo para modificar.' });

    const today = todayIso();
    const details: Record<string, string> = {};
    const has = (field: string) => keys.includes(field) && details[field] === undefined;

    for (const key of keys) {
        if (key === 'jurisdiction') details.jurisdiction = 'El fuero de una causa no se puede modificar.';
        else if (key === 'clientId') details.clientId = 'El cliente de una causa no se puede modificar.';
        else if (!(CASE_PATCH_FIELDS as readonly string[]).includes(key)) details[key] = MSG_NOT_MODIFIABLE;
        else {
            const rule = CASE_FIELD_JURISDICTIONS[key];
            if (rule && !rule.only.includes(stored.jurisdiction)) details[key] = rule.message;
        }
    }

    const next: StoredCase = { ...stored, qualifications: [...stored.qualifications] };

    const readText = (field: 'caption' | 'court' | 'instructorName' | 'tribunalPhone' | 'instructorExtension' | 'counterparty' | 'subjectMatter', max: number, required: boolean) => {
        if (!has(field)) return;
        const value = body[field];
        if (value === null || (typeof value === 'string' && value.trim() === '')) {
            if (required) details[field] = MSG_NOT_EMPTY;
            else Object.assign(next, { [field]: null });
        } else if (typeof value !== 'string') details[field] = MSG_NOT_TEXT;
        else if (value.trim().length > max) details[field] = `Puede tener hasta ${max} caracteres.`;
        else Object.assign(next, { [field]: value.trim() });
    };
    const readBoolean = (field: 'clientDetained' | 'injunctionGranted' | 'harmfulActRenews' | 'courtFeePaid') => {
        if (!has(field)) return;
        if (typeof body[field] !== 'boolean') details[field] = MSG_NOT_BOOL_FIELD;
        else Object.assign(next, { [field]: body[field] });
    };
    const readPastDate = (field: 'harmfulActDate' | 'administrativeRemedyExhaustedOn' | 'startDate') => {
        if (!has(field)) return;
        const value = body[field];
        if (value === null) Object.assign(next, { [field]: null });
        else if (!isIsoDate(value)) details[field] = MSG_NOT_DATE;
        else if (value > today) details[field] = 'No puede ser posterior a hoy.';
        else Object.assign(next, { [field]: value });
    };
    const readCount = (field: 'harmfulActRenewalDays' | 'harmfulActTermDays') => {
        if (!has(field)) return;
        if (body[field] === null) Object.assign(next, { [field]: null });
        else if (readPositiveInteger(body[field]) === undefined) details[field] = 'Debe ser un número entero mayor o igual a 1.';
        else Object.assign(next, { [field]: body[field] });
    };

    if (has('sacNumber')) {
        if (body.sacNumber === null) next.sacNumber = null;
        else if (typeof body.sacNumber !== 'string' || !RE_SAC.test(body.sacNumber)) details.sacNumber = 'Debe contener exactamente 8 dígitos.';
        else next.sacNumber = body.sacNumber;
    }
    readText('caption', CAPTION_MAX, true);
    readText('court', COURT_MAX, false);
    readText('instructorName', INSTRUCTOR_NAME_MAX, false);
    readText('tribunalPhone', TRIBUNAL_PHONE_MAX, false);
    readText('instructorExtension', INSTRUCTOR_EXTENSION_MAX, false);
    readText('counterparty', COUNTERPARTY_MAX, false);
    readText('subjectMatter', SUBJECT_MATTER_MAX, true);
    readBoolean('clientDetained');
    readBoolean('injunctionGranted');
    readBoolean('harmfulActRenews');
    readBoolean('courtFeePaid');
    readPastDate('harmfulActDate');
    readPastDate('administrativeRemedyExhaustedOn');
    readPastDate('startDate');
    readCount('harmfulActRenewalDays');
    readCount('harmfulActTermDays');

    if (has('harmfulActTermDayType')) {
        const dayType = body.harmfulActTermDayType;
        if (dayType === null || dayType === 'BUSINESS' || dayType === 'CONSECUTIVE') next.harmfulActTermDayType = dayType;
        else details.harmfulActTermDayType = 'Debe ser BUSINESS o CONSECUTIVE.';
    }
    if (has('responsibleLawyerId')) {
        const id = readBodyId(body.responsibleLawyerId);
        if (id === undefined || !db.lawyers.some((l) => l.id === id && l.active)) {
            details.responsibleLawyerId = 'No existe un abogado vigente con ese identificador.';
        } else next.responsibleLawyerId = id;
    }
    if (has('proceduralRole')) {
        if (!isProceduralRole(body.proceduralRole, stored.jurisdiction)) details.proceduralRole = 'El rol procesal no corresponde al fuero.';
        else next.proceduralRole = body.proceduralRole;
    }
    if (has('legalQualifications')) {
        // Reemplaza la lista entera; `[]` deja la causa sin calificaciones.
        const read = readCaseQualifications(body.legalQualifications, today);
        if (read.ok) next.qualifications = read.value;
        else details.legalQualifications = read.message;
    }

    /* La fecha de inicio va con el SAC, como en el alta: quitar el SAC exige
       quitarla, y agregarlo exige tenerla. */
    if ((keys.includes('sacNumber') || keys.includes('startDate')) && !details.sacNumber && !details.startDate) {
        if (next.sacNumber !== null && next.startDate === null) {
            details.startDate = 'Es obligatoria cuando la causa tiene número de SAC.';
        } else if (next.sacNumber === null && next.startDate !== null) {
            details.startDate = 'Sin número de SAC la causa no tiene fecha de inicio.';
        }
    }

    /* El acto lesivo del amparo, como queda después del cambio (D-78): sin
       fecha se borran sus datos; con fecha, el plazo es obligatorio. */
    const harmfulFields = ['harmfulActDate', 'harmfulActRenews', 'harmfulActRenewalDays', 'harmfulActTermDays', 'harmfulActTermDayType'];
    if (stored.jurisdiction === 'AMPARO' && harmfulFields.some((f) => keys.includes(f)) && harmfulFields.every((f) => !details[f])) {
        if (next.harmfulActDate === null) {
            for (const field of ['harmfulActRenewalDays', 'harmfulActTermDays', 'harmfulActTermDayType'] as const) {
                if (isPresent(body[field])) details[field] = 'Solo corresponde si se informa la fecha del acto lesivo.';
            }
            next.harmfulActRenews = false;
            next.harmfulActRenewalDays = null;
            next.harmfulActTermDays = null;
            next.harmfulActTermDayType = null;
        } else {
            if (next.harmfulActRenews && next.harmfulActRenewalDays === null) {
                details.harmfulActRenewalDays = 'Indicá cada cuántos días se renueva el acto lesivo.';
            } else if (!next.harmfulActRenews) {
                if (isPresent(body.harmfulActRenewalDays)) details.harmfulActRenewalDays = 'Solo corresponde si el acto lesivo se renueva.';
                next.harmfulActRenewalDays = null;
            }
            if (next.harmfulActTermDays === null) details.harmfulActTermDays = 'Indicá el plazo para presentar el amparo.';
            if (next.harmfulActTermDayType === null) details.harmfulActTermDayType = 'Indicá si el plazo se cuenta en días hábiles o corridos.';
        }
    }

    if (Object.keys(details).length > 0) return validationError(details);

    // El SAC es único entre las causas vigentes: el de una dada de baja se puede usar (D-97).
    if (keys.includes('sacNumber') && next.sacNumber !== null &&
        db.cases.some((c) => c.active && c.id !== stored.id && c.sacNumber === next.sacNumber)) {
        return fail(409, ERRORS.caseSacTaken);
    }

    // En una causa "Prescripta" no se tocan las calificaciones que la sostienen (D-96).
    if (keys.includes('legalQualifications') && stored.prescriptionDeclaration) {
        return fail(422, ERRORS.prescribedCaseQualifications);
    }
    // D-113, CA-33.18: una calificación declarada queda, con su fecha del hecho y su declaración.
    if (keys.includes('legalQualifications')) {
        for (const declared of stored.qualifications.filter((q) => q.prescriptionDeclaration)) {
            const kept = next.qualifications.find((q) => q.legalQualificationId === declared.legalQualificationId);
            if (!kept || kept.offenseDate !== declared.offenseDate) {
                return fail(422, ERRORS.prescribedQualificationLocked);
            }
            kept.prescriptionDeclaration = declared.prescriptionDeclaration;
        }
    }

    const folderMoves = next.caption !== stored.caption || next.responsibleLawyerId !== stored.responsibleLawyerId;
    Object.assign(stored, next);
    if (folderMoves && stored.folder) {
        // Una carpeta que no está creada no tiene nada que mover en Drive.
        if (stored.folder.status !== 'CREATED' || !db.failures.documentStorage) {
            stored.folder.path = expectedFolderPath(stored);
        }
    }

    return ok(itemBody(toCase(stored)));
};

const REASON_MAX = 500;

/**
 * Da de baja una causa (HU21, V5 D-97). Es lógica: queda en la base con todo
 * lo suyo, pero para el cliente deja de existir —ella y sus subrecursos
 * responden `404`, no aparece en los listados, los tableros ni los conteos—.
 * Su SAC queda libre y su carpeta en Drive no se toca. Cualquier perfil, en
 * cualquier estado.
 */
const deleteCase: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    // El único `DELETE` con cuerpo, y es opcional: el motivo de la baja.
    const body = asObject(request.body);
    if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') {
        return validationError({ reason: MSG_NOT_TEXT });
    }
    const reason = optionalText(body.reason);
    if (reason !== null && reason.length > REASON_MAX) {
        return validationError({ reason: `Debe tener hasta ${REASON_MAX} caracteres.` });
    }

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);
    if (!canOperateCase(auth.user, stored)) return fail(403, ERRORS.forbiddenNotResponsibleCaseDelete);

    stored.active = false;
    stored.deactivation = { reason, byId: auth.user.id, at: nowIso() };
    return NO_CONTENT;
};

/* ------------------------------------------------------------------ */
/* GET /cases/{caseId}/cover (V5, HU24)                                */
/* ------------------------------------------------------------------ */

type Disposition = 'inline' | 'attachment';
type DispositionResult = { ok: true; value: Disposition } | { ok: false; response: MockResponse };

/** El parámetro `disposition` de las descargas (V5 §3.7 y §3.12). */
function readDisposition(query: URLSearchParams, fallbackValue: Disposition): DispositionResult {
    const value = query.get('disposition');
    if (value === null || value === '') return { ok: true, value: fallbackValue };
    if (value === 'inline' || value === 'attachment') return { ok: true, value };
    return { ok: false, response: invalidQuery({ disposition: 'Debe ser inline o attachment.' }) };
}

/** `APELLIDO NOMBRES`, como lo escribe la hoja de carátula. */
function coverName(person: { lastName: string; firstName: string }): string {
    return `${person.lastName} ${person.firstName}`.toUpperCase();
}

/**
 * Los dos recuadros de las partes (V5 §3.7, "Partes"). En el penal, la causa
 * sólo registra al cliente: la otra parte la manda el cliente al generar el
 * expediente (`opposingParty`) y, sin ella, ese recuadro queda vacío. El
 * tratamiento del abogado es el prefijo fijo `DR/DRA.` (D-106).
 */
function coverParties(stored: StoredCase, opposingParty: string | null): { actor: string[]; defendant: string[] } {
    const client = db.clients.find((c) => c.id === stored.clientId);
    const lawyer = db.lawyers.find((l) => l.id === stored.responsibleLawyerId);
    const clientName = client ? coverName(client) : '';
    const defender = lawyer ? `DEFENSOR: DR/DRA. ${coverName(lawyer)}` : '';
    const other = opposingParty ? opposingParty.toUpperCase().split('\n') : [];
    const counterparty = stored.counterparty ? [stored.counterparty.toUpperCase()] : [];

    if (stored.jurisdiction === 'CRIMINAL') {
        return stored.proceduralRole === 'QUERELLANTE_PARTICULAR'
            ? { actor: [`QUERELLANTE (${clientName})`, defender], defendant: other }
            : { actor: other, defendant: [clientName, defender] };
    }
    return stored.proceduralRole === 'DEMANDADA'
        ? { actor: counterparty, defendant: [clientName] }
        : { actor: [clientName], defendant: counterparty };
}

/**
 * Los renglones de la hoja de carátula, recuadro por recuadro y en mayúsculas.
 * Una sola función para la carátula suelta y para la hoja 1 del expediente
 * (V5 D-94): lo que cambia es sólo lo que manda el cliente en `cover`.
 */
function coverLines(stored: StoredCase, cover: { opposingParty: string | null; notes: string | null } | null): string[] {
    const { actor, defendant } = coverParties(stored, cover?.opposingParty ?? null);
    const template = stored.jurisdiction === 'CRIMINAL' ? 'PENAL' : 'ADMINISTRATIVO';
    return [
        `CARATULA (PLANTILLA ${template})`,
        '',
        `EXPTE. / SAC: ${stored.sacNumber ?? ''}`,
        `AUTOS: ${stored.caption.toUpperCase()}`,
        '',
        'ACTOR / QUERELLANTE:',
        ...actor,
        '',
        'DEMANDADO / IMPUTADO:',
        ...defendant,
        '',
        'ORGANO INTERVINIENTE:',
        (stored.court ?? '').toUpperCase(),
        `SECRETARIO/A: ${(stored.instructorName ?? '').toUpperCase()}`,
        '',
        'OBSERVACIONES:',
        ...(cover?.notes ? cover.notes.toUpperCase().split('\n') : []),
    ];
}

/** `Caratula_13284571.pdf`, o `Caratula_causa-23.pdf` sin SAC. */
function sacOrId(stored: StoredCase): string {
    return stored.sacNumber ?? `causa-${stored.id}`;
}

/**
 * La hoja de carátula en PDF (HU24). Se arma en cada pedido con los datos
 * vigentes de la causa y nada se guarda (D-92); no usa la carpeta, así que
 * anda aunque la causa no la tenga. La plantilla la elige el fuero (D-93).
 */
const getCaseCover: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const disposition = readDisposition(request.query, 'inline');
    if (!disposition.ok) return disposition.response;

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);

    return {
        status: 200,
        body: null,
        file: {
            content: buildPdf([coverLines(stored, null)]),
            contentType: PDF_MIME,
            fileName: `Caratula_${sacOrId(stored)}.pdf`,
            disposition: disposition.value,
        },
    };
};

/* ------------------------------------------------------------------ */
/* PATCH /cases/{caseId}/procedural-acts/{actId} (V5, HU28)            */
/* ------------------------------------------------------------------ */

const ACT_PATCH_FIELDS = ['proceduralStateId', 'customState', 'actDate', 'notificationDate', 'manualDueDate', 'notes'];

/**
 * Modifica un acto procesal (HU28, V5 §3.8). Lo hace el responsable **actual**
 * de la causa, igual que el registro, y en el mismo orden: `404`, `403`, `400`.
 *
 * Las reglas se validan sobre el acto como queda. El plazo se recalcula con el
 * de la tabla si cambia el estado y con el copiado si no (D-98). El estado de
 * la causa no se escribe: sale del acto más reciente en la próxima lectura, así
 * que corregir una fecha puede cambiarlo y corregir el acto que la cerró la
 * reabre (D-99). Una causa "Prescripta" no admite modificar sus actos.
 */
const updateProceduralAct: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);
    const actId = readRouteId(params, 'actId');
    if (actId === undefined) return fail(400, ERRORS.invalidActId);

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);
    const act = db.proceduralActs.find((a) => a.id === actId && a.caseId === stored.id);
    if (!act) return fail(404, ERRORS.proceduralActNotFound);

    if (!isResponsibleLawyer(auth.user, stored)) return fail(403, ERRORS.forbiddenNotResponsibleModify);

    const body = asObject(request.body);
    const keys = Object.keys(body);
    if (keys.length === 0) return validationError({ body: 'Debe enviarse al menos un campo para modificar.' });

    const details: Record<string, string> = {};
    for (const key of keys) {
        if (!ACT_PATCH_FIELDS.includes(key)) details[key] = 'No es un dato modificable del acto procesal.';
    }

    /* El estado: si viene, con las mismas reglas que el registro. */
    const stateChanged = keys.includes('proceduralStateId') || keys.includes('customState');
    const hasStateId = isPresent(body.proceduralStateId);
    const customState = optionalText(body.customState);
    let state = stateChanged ? undefined : (act.proceduralStateId === null ? undefined : db.proceduralStates.find((s) => s.id === act.proceduralStateId));
    let nextCustomState = stateChanged ? null : act.customState;

    if (stateChanged) {
        if (hasStateId && customState !== null) {
            details.proceduralStateId = 'Elegí un estado de la tabla o escribí uno, no las dos cosas.';
        } else if (hasStateId) {
            state = allowedTargetState(readBodyId(body.proceduralStateId), stored.jurisdiction);
            if (!state) details.proceduralStateId = MSG_STATE_NOT_ALLOWED;
        } else if (customState === null) {
            details.proceduralStateId = 'Debe indicarse el estado procesal al que pasa la causa.';
        } else if (customState.length > CUSTOM_STATE_MAX) {
            details.customState = `Puede tener hasta ${CUSTOM_STATE_MAX} caracteres.`;
        } else if (customState.toLowerCase() === INITIAL_STATE_NAME.toLowerCase()) {
            details.customState = `"${INITIAL_STATE_NAME}" es el estado inicial y no puede ser destino de un acto.`;
        } else if (db.proceduralStates.some((s) => s.active && s.jurisdiction === stored.jurisdiction && s.name.toLowerCase() === customState.toLowerCase())) {
            details.customState = 'Coincide con un estado de la tabla del fuero: enviá su proceduralStateId.';
        } else {
            nextCustomState = customState;
        }
    }

    /* El plazo que rige: el de la tabla si cambia el estado; el que el acto
       copió al registrarse si no (D-98, D-08). */
    const term = stateChanged
        ? (state ?? null)
        : act.deadline
            ? { timeLimitDays: act.deadline.timeLimitDays, dayType: act.deadline.dayType }
            : (state ?? null);

    const actDate = keys.includes('actDate') ? body.actDate : act.actDate;
    const notificationDate = keys.includes('notificationDate') ? body.notificationDate : act.notificationDate;
    Object.assign(details, actDateErrors({
        jurisdiction: stored.jurisdiction,
        opensTerm: (term?.timeLimitDays ?? 0) > 0,
        actDate,
        notificationDate,
    }));

    let notes = act.notes;
    if (keys.includes('notes')) {
        notes = optionalText(body.notes);
        const error = maxLengthError(notes, NOTES_MAX);
        if (error) details.notes = error;
    }

    const validActDate = isIsoDate(actDate) ? actDate : act.actDate;
    const validNotification = isIsoDate(notificationDate) ? notificationDate : null;
    const countsFrom = stored.jurisdiction === 'ADMINISTRATIVE' && validNotification ? validNotification : validActDate;

    /* El ajuste manual que no se toca se conserva, si sigue siendo válido. */
    let manualDueDate = act.deadline?.manuallyAdjusted ? act.deadline.dueDate : null;
    if (keys.includes('manualDueDate')) {
        if (body.manualDueDate === null) manualDueDate = null;
        else if (!isIsoDate(body.manualDueDate)) details.manualDueDate = MSG_NOT_DATE;
        else if (state?.terminal) details.manualDueDate = 'Un estado terminal no abre plazo: no admite un vencimiento manual.';
        else manualDueDate = body.manualDueDate;
    } else if (state?.terminal) {
        manualDueDate = null;
    }
    if (!details.manualDueDate && manualDueDate !== null && manualDueDate < countsFrom) {
        details.manualDueDate = 'No puede ser anterior a la fecha desde la que corre el plazo.';
    }

    if (Object.keys(details).length > 0) return validationError(details);

    // "Prescripta" no la puso un acto: corregir uno no la saca de ahí (D-99).
    if (stored.prescriptionDeclaration) return fail(422, ERRORS.prescribedCaseActs);

    act.proceduralStateId = nextCustomState === null ? (state?.id ?? null) : null;
    act.customState = nextCustomState;
    act.actDate = validActDate;
    act.notificationDate = validNotification;
    act.notes = notes;
    act.deadline = buildActDeadline({
        state: term,
        jurisdiction: stored.jurisdiction,
        actDate: validActDate,
        notificationDate: validNotification,
        manualDueDate,
    });
    act.lastModifiedById = auth.user.id;
    act.lastModifiedAt = nowIso();

    return ok(itemBody(toProceduralAct(act)));
};

/* ------------------------------------------------------------------ */
/* Documentación de la causa (V5 §3.12, HU38 y HU25)                   */
/* ------------------------------------------------------------------ */

/**
 * Los documentos de la carpeta de la causa (HU38), del más reciente al más
 * antiguo, sin paginar. Abierto a los tres perfiles (D-103): el Administrador
 * los necesita para elegir los del expediente. Sin carpeta creada responde la
 * lista vacía; con Drive caído, `502`.
 */
const listCaseDocuments: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);

    const folder = stored.folder;
    if (folder?.status !== 'CREATED') {
        const empty: CaseDocuments = { folderStatus: folder?.status ?? null, folderUrl: folder?.url ?? null, readAt: null, documents: [] };
        return ok(itemBody(empty));
    }
    if (db.failures.documentStorage) return fail(502, ERRORS.caseFolderUnreadable);

    const data: CaseDocuments = {
        folderStatus: folder.status,
        folderUrl: folder.url,
        readAt: nowIso(),
        documents: db.documents
            .filter((d) => d.caseId === stored.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
            .map(toCaseDocument),
    };
    return ok(itemBody(data));
};

/** El contenido falso de un documento: un PDF si lo es o si se exporta, texto si no. */
function documentFile(stored: StoredCase, doc: StoredDocument) {
    if (doc.caseFile) {
        const documents = doc.caseFile.parts.slice(1).map((name) => [`DOCUMENTO: ${name}`]);
        return { content: buildPdf([coverLines(stored, doc.caseFile.cover), ...documents]), contentType: PDF_MIME, fileName: doc.name };
    }
    // Los documentos nativos de Google se descargan exportados a PDF (V5 §3.12).
    if (isGoogleNative(doc.mimeType)) {
        return { content: buildPdf([[doc.name]]), contentType: PDF_MIME, fileName: `${doc.name}.pdf` };
    }
    if (doc.mimeType === PDF_MIME) return { content: buildPdf([[doc.name]]), contentType: PDF_MIME, fileName: doc.name };
    return { content: `Documento de la causa: ${doc.name}`, contentType: doc.mimeType, fileName: doc.name };
}

/**
 * Descarga un archivo de la carpeta (HU38, HU25). Un expediente generado lo
 * descarga cualquier perfil; otro documento, sólo `LAWYER` o `SECRETARY`
 * (D-103). Un id de otra carpeta es `404`, aunque exista.
 */
const downloadCaseDocument: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const disposition = readDisposition(request.query, 'attachment');
    if (!disposition.ok) return disposition.response;

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);

    const documentId = decodeURIComponent(params.documentId ?? '');
    const doc = stored.folder?.status === 'CREATED'
        ? db.documents.find((d) => d.id === documentId && d.caseId === stored.id)
        : undefined;
    if (!doc) return fail(404, ERRORS.documentNotFound);

    if (!doc.caseFile && !auth.user.roles.some((role) => role === 'LAWYER' || role === 'SECRETARY')) {
        return fail(403, ERRORS.forbiddenLawyerOrSecretary);
    }
    if (db.failures.documentStorage) return fail(502, ERRORS.documentDownloadFailed);

    return { status: 200, body: null, file: { ...documentFile(stored, doc), disposition: disposition.value } };
};

const COVER_TEXT_MAX = 500;

/** Hojas que suma un documento al expediente: una imagen por hoja, el resto según su peso. */
function pagesOf(doc: StoredDocument): number {
    if (doc.mimeType.startsWith('image/') || doc.sizeBytes === null) return 1;
    return Math.max(1, Math.ceil(doc.sizeBytes / 100_000));
}

/**
 * Genera el expediente (HU25, V5 D-102): la carátula, siempre primera, y los
 * documentos elegidos en el orden en que llegan, en un único PDF que se guarda
 * en la carpeta como nueva versión. Es sincrónico y atómico: si Drive falla no
 * queda nada y no se consume el número de versión.
 */
const createCaseFile: Handler = ({ request, params }) => {
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const caseId = readRouteId(params, 'caseId');
    if (caseId === undefined) return fail(400, ERRORS.invalidCaseId);

    const stored = db.cases.find((c) => c.id === caseId && c.active);
    if (!stored) return fail(404, ERRORS.caseNotFound);

    const body = asObject(request.body);
    const details: Record<string, string> = {};

    const ids = body.documentIds;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string' && id.trim() !== '')) {
        details.documentIds = 'Elegí al menos un documento.';
    } else if (new Set(ids).size !== ids.length) {
        details.documentIds = 'No puede repetirse un documento.';
    }

    let opposingParty: string | null = null;
    let notes: string | null = null;
    if (body.cover !== undefined && body.cover !== null) {
        if (typeof body.cover !== 'object' || Array.isArray(body.cover)) details.cover = 'Debe ser un objeto.';
        else {
            const cover = asObject(body.cover);
            opposingParty = optionalText(cover.opposingParty);
            notes = optionalText(cover.notes);
            // La parte que no está en la causa sólo existe en el penal (D-92).
            if (opposingParty !== null && stored.jurisdiction !== 'CRIMINAL') {
                details.cover = 'La parte de la carátula solo corresponde al fuero penal.';
            } else if (opposingParty !== null && opposingParty.length > COVER_TEXT_MAX) {
                details['cover.opposingParty'] = `Puede tener hasta ${COVER_TEXT_MAX} caracteres.`;
            }
            if (notes !== null && notes.length > COVER_TEXT_MAX) {
                details['cover.notes'] = `Puede tener hasta ${COVER_TEXT_MAX} caracteres.`;
            }
        }
    }
    if (Object.keys(details).length > 0) return validationError(details);

    // El expediente se guarda en la carpeta: sin ella no hay dónde (D-102).
    if (stored.folder?.status !== 'CREATED') return fail(422, ERRORS.caseFolderNotAvailable);

    const docs = (ids as string[]).map((id) => db.documents.find((d) => d.id === id && d.caseId === stored.id));
    // Un expediente anterior no se incluye en otro.
    if (docs.some((d) => d === undefined || d.caseFile !== null)) {
        return validationError({ documentIds: 'Un documento no está en la carpeta de la causa o es un expediente anterior.' });
    }
    const chosen = docs as StoredDocument[];
    if (chosen.some((d) => !toCaseDocument(d).convertibleToPdf)) return fail(422, ERRORS.documentNotConvertible);

    if (db.failures.documentStorage) return fail(502, ERRORS.caseFileGenerationFailed);

    const version = (db.caseFileVersions.get(stored.id) ?? 0) + 1;
    db.caseFileVersions.set(stored.id, version);
    const caseFileId = db.nextCaseFileId;
    db.nextCaseFileId += 1;

    const at = nowIso();
    const parts: CaseFilePart[] = [
        { position: 1, kind: 'COVER', documentId: null, name: 'Carátula' },
        ...chosen.map((d, index) => ({ position: index + 2, kind: 'DOCUMENT' as const, documentId: d.id, name: d.name })),
    ];
    const generated: StoredDocument = {
        id: `vz-expediente-${caseFileId}`,
        caseId: stored.id,
        name: `Expediente_${sacOrId(stored)}_v${version}.pdf`,
        mimeType: PDF_MIME,
        sizeBytes: 40_960 + chosen.reduce((total, d) => total + (d.sizeBytes ?? 20_480), 0),
        createdAt: at,
        modifiedAt: at,
        uploadedBy: SYSTEM_UPLOADER,
        caseFile: { id: caseFileId, version, parts: parts.map((p) => p.name), cover: { opposingParty, notes } },
    };
    db.documents.push(generated);

    const data: GeneratedCaseFile = {
        document: toCaseDocument(generated),
        version,
        pageCount: 1 + chosen.reduce((total, d) => total + pagesOf(d), 0),
        parts,
        generatedBy: userRef(auth.user.id),
        generatedAt: at,
    };
    return created(itemBody(data));
};

/* ------------------------------------------------------------------ */
/* Tabla de rutas                                                      */
/* ------------------------------------------------------------------ */

interface Route {
    method: HttpMethod;
    /**
     * La ruta en la notación de MSW, con `:param` donde `pattern` tiene un
     * grupo. Es lo único que mira la capa de transporte para decidir qué
     * interceptar; quién responde qué lo sigue decidiendo `pattern`.
     *
     * Vive acá y no en `msw-handlers.ts` porque antes eran dos listas
     * sincronizadas a mano y se desincronizaron: faltaba `POST /auth/refresh`,
     * así que la renovación del token nunca se interceptaba y el pedido salía
     * a la red. Con la ruta declarada una sola vez eso no puede repetirse.
     */
    path: string;
    pattern: RegExp;
    handler: Handler;
}

const ROUTES: Route[] = [
    { method: 'POST', path: '/auth/login', pattern: /^\/auth\/login$/, handler: login },
    { method: 'POST', path: '/auth/refresh', pattern: /^\/auth\/refresh$/, handler: refresh },
    { method: 'POST', path: '/auth/logout', pattern: /^\/auth\/logout$/, handler: logout },
    { method: 'PATCH', path: '/auth/password', pattern: /^\/auth\/password$/, handler: changePassword },

    { method: 'POST', path: '/users', pattern: /^\/users$/, handler: createUser },
    { method: 'GET', path: '/users', pattern: /^\/users$/, handler: listUsers },
    { method: 'GET', path: '/users/:userId', pattern: /^\/users\/(?<userId>[^/]+)$/, handler: getUser },
    { method: 'PATCH', path: '/users/:userId', pattern: /^\/users\/(?<userId>[^/]+)$/, handler: updateUser },
    { method: 'DELETE', path: '/users/:userId', pattern: /^\/users\/(?<userId>[^/]+)$/, handler: deleteUser },

    { method: 'POST', path: '/lawyers', pattern: /^\/lawyers$/, handler: createLawyer },
    { method: 'GET', path: '/lawyers', pattern: /^\/lawyers$/, handler: listLawyers },
    { method: 'GET', path: '/lawyers/:lawyerId', pattern: /^\/lawyers\/(?<lawyerId>[^/]+)$/, handler: getLawyer },
    { method: 'PATCH', path: '/lawyers/:lawyerId', pattern: /^\/lawyers\/(?<lawyerId>[^/]+)$/, handler: updateLawyer },
    { method: 'DELETE', path: '/lawyers/:lawyerId', pattern: /^\/lawyers\/(?<lawyerId>[^/]+)$/, handler: deleteLawyer },

    { method: 'POST', path: '/procedural-states', pattern: /^\/procedural-states$/, handler: createProceduralState },
    { method: 'GET', path: '/procedural-states', pattern: /^\/procedural-states$/, handler: listProceduralStates },
    { method: 'GET', path: '/procedural-states/:stateId', pattern: /^\/procedural-states\/(?<stateId>[^/]+)$/, handler: getProceduralState },
    { method: 'PATCH', path: '/procedural-states/:stateId', pattern: /^\/procedural-states\/(?<stateId>[^/]+)$/, handler: updateProceduralState },
    { method: 'DELETE', path: '/procedural-states/:stateId', pattern: /^\/procedural-states\/(?<stateId>[^/]+)$/, handler: deleteProceduralState },

    { method: 'POST', path: '/legal-qualifications', pattern: /^\/legal-qualifications$/, handler: createLegalQualification },
    { method: 'GET', path: '/legal-qualifications', pattern: /^\/legal-qualifications$/, handler: listLegalQualifications },
    { method: 'GET', path: '/legal-qualifications/:qualificationId', pattern: /^\/legal-qualifications\/(?<qualificationId>[^/]+)$/, handler: getLegalQualification },
    { method: 'PATCH', path: '/legal-qualifications/:qualificationId', pattern: /^\/legal-qualifications\/(?<qualificationId>[^/]+)$/, handler: updateLegalQualification },
    { method: 'DELETE', path: '/legal-qualifications/:qualificationId', pattern: /^\/legal-qualifications\/(?<qualificationId>[^/]+)$/, handler: deleteLegalQualification },

    { method: 'POST', path: '/clients', pattern: /^\/clients$/, handler: createClient },
    { method: 'GET', path: '/clients', pattern: /^\/clients$/, handler: listClients },
    { method: 'GET', path: '/clients/:clientId', pattern: /^\/clients\/(?<clientId>[^/]+)$/, handler: getClient },

    { method: 'POST', path: '/cases', pattern: /^\/cases$/, handler: createCase },
    { method: 'GET', path: '/cases', pattern: /^\/cases$/, handler: listCases },
    /* `custom-states` va ANTES que `:caseId`: las rutas se resuelven en orden
       y, al revés, "custom-states" se tomaría como un id de causa inválido. */
    { method: 'GET', path: '/cases/custom-states', pattern: /^\/cases\/custom-states$/, handler: listCustomStates },
    { method: 'GET', path: '/cases/:caseId', pattern: /^\/cases\/(?<caseId>[^/]+)$/, handler: getCase },
    { method: 'PATCH', path: '/cases/:caseId', pattern: /^\/cases\/(?<caseId>[^/]+)$/, handler: updateCase },
    { method: 'DELETE', path: '/cases/:caseId', pattern: /^\/cases\/(?<caseId>[^/]+)$/, handler: deleteCase },
    { method: 'GET', path: '/cases/:caseId/cover', pattern: /^\/cases\/(?<caseId>[^/]+)\/cover$/, handler: getCaseCover },

    { method: 'POST', path: '/cases/:caseId/prescription', pattern: /^\/cases\/(?<caseId>[^/]+)\/prescription$/, handler: declarePrescription },
    { method: 'POST', path: '/cases/:caseId/legal-qualifications/:legalQualificationId/prescription', pattern: /^\/cases\/(?<caseId>[^/]+)\/legal-qualifications\/(?<legalQualificationId>[^/]+)\/prescription$/, handler: declareQualificationPrescription },
    { method: 'POST', path: '/cases/:caseId/folder', pattern: /^\/cases\/(?<caseId>[^/]+)\/folder$/, handler: createCaseFolder },

    { method: 'POST', path: '/cases/:caseId/procedural-acts', pattern: /^\/cases\/(?<caseId>[^/]+)\/procedural-acts$/, handler: createProceduralAct },
    { method: 'GET', path: '/cases/:caseId/procedural-acts/deadline-preview', pattern: /^\/cases\/(?<caseId>[^/]+)\/procedural-acts\/deadline-preview$/, handler: previewDeadline },
    { method: 'GET', path: '/cases/:caseId/procedural-acts', pattern: /^\/cases\/(?<caseId>[^/]+)\/procedural-acts$/, handler: listProceduralActs },
    { method: 'GET', path: '/cases/:caseId/procedural-acts/:actId', pattern: /^\/cases\/(?<caseId>[^/]+)\/procedural-acts\/(?<actId>[^/]+)$/, handler: getProceduralAct },
    { method: 'PATCH', path: '/cases/:caseId/procedural-acts/:actId', pattern: /^\/cases\/(?<caseId>[^/]+)\/procedural-acts\/(?<actId>[^/]+)$/, handler: updateProceduralAct },
    { method: 'GET', path: '/cases/:caseId/timeline', pattern: /^\/cases\/(?<caseId>[^/]+)\/timeline$/, handler: getCaseTimeline },

    { method: 'POST', path: '/cases/:caseId/interruptive-acts', pattern: /^\/cases\/(?<caseId>[^/]+)\/interruptive-acts$/, handler: createInterruptiveAct },
    { method: 'GET', path: '/cases/:caseId/interruptive-acts', pattern: /^\/cases\/(?<caseId>[^/]+)\/interruptive-acts$/, handler: listInterruptiveActs },

    { method: 'GET', path: '/cases/:caseId/documents', pattern: /^\/cases\/(?<caseId>[^/]+)\/documents$/, handler: listCaseDocuments },
    { method: 'GET', path: '/cases/:caseId/documents/:documentId/file', pattern: /^\/cases\/(?<caseId>[^/]+)\/documents\/(?<documentId>[^/]+)\/file$/, handler: downloadCaseDocument },
    { method: 'POST', path: '/cases/:caseId/case-files', pattern: /^\/cases\/(?<caseId>[^/]+)\/case-files$/, handler: createCaseFile },

    { method: 'POST', path: '/document-templates', pattern: /^\/document-templates$/, handler: createDocumentTemplate },
    { method: 'GET', path: '/document-templates', pattern: /^\/document-templates$/, handler: listDocumentTemplates },
    { method: 'GET', path: '/document-templates/:templateId', pattern: /^\/document-templates\/(?<templateId>[^/]+)$/, handler: getDocumentTemplate },
    { method: 'GET', path: '/document-templates/:templateId/file', pattern: /^\/document-templates\/(?<templateId>[^/]+)\/file$/, handler: downloadDocumentTemplate },

    { method: 'GET', path: '/dashboards/lawyer', pattern: /^\/dashboards\/lawyer$/, handler: lawyerDashboard },
    { method: 'GET', path: '/dashboards/administrator', pattern: /^\/dashboards\/administrator$/, handler: administratorDashboard },

];

/**
 * Resuelve un pedido contra el contrato.
 *
 * Una ruta que no está en la tabla devuelve el `404 RESOURCE_NOT_FOUND`
 * general de §5.2, con el método y la ruta en el mensaje para que se note
 * rápido cuándo el front está pegándole a un endpoint que no existe.
 */
export function resolveRequest(request: MockRequest): MockResponse {
    for (const route of ROUTES) {
        if (route.method !== request.method) continue;
        const match = route.pattern.exec(request.path);
        if (!match) continue;
        return route.handler({ request, params: match.groups ?? {} });
    }

    return fail(
        404,
        errorBody('RESOURCE_NOT_FOUND', `${request.method} ${request.path} no existe en el contrato.`),
    );
}

/**
 * El método y la ruta de cada endpoint implementado, sin los handlers.
 *
 * Es lo que consume `msw-handlers.ts` para registrar los interceptores. Se
 * expone sólo esto y no `ROUTES` entera porque la capa de transporte no tiene
 * nada que hacer con `pattern` ni con `handler`.
 */
export const ROUTE_TABLE: readonly { method: HttpMethod; path: string }[] = ROUTES.map(
    ({ method, path }) => ({ method, path }),
);

/** Las rutas implementadas, para documentación o para un panel de debug. */
export const IMPLEMENTED_ENDPOINTS = ROUTE_TABLE.map((r) => `${r.method} ${r.path}`);
