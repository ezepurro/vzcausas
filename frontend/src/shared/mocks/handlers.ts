/**
 * Servidor falso: implementa los endpoints de `API_CONTRACT_V3.md` (con la
 * revisión del 05/10/2026) sobre la base en memoria de `db.ts`.
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
    type DayType,
    type DeadlinePreview,
    type Jurisdiction,
    type Lawyer,
    type ProceduralRole,
    type Role,
    permissionsFor,
    type RefreshedSession,
    type Session,
} from './contract';
import { businessDaysUntil, computeDueDate, isIsoDate, todayIso } from './calendar';
import {
    buildActDeadline,
    db,
    isActiveCase,
    isInTerminalState,
    issueToken,
    latestActOf,
    revokeToken,
    revokeUserSessions,
    toCase,
    toClient,
    toLawyer,
    toLegalQualification,
    toProceduralAct,
    toProceduralState,
    toUser,
    userForRenewal,
    userFromToken,
    type StoredAct,
    type StoredCase,
    type StoredCaseQualification,
} from './db';
import {
    EXPIRES_IN,
    INITIAL_STATE_NAME,
    PROTECTED_ADMIN_USER,
    USERS_WITH_DEPENDENCIES,
    type StoredClient,
    type StoredLegalQualification,
    type StoredProceduralState,
    type StoredUser,
} from './fixtures';
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
    /** Token del header `Authorization: Bearer <token>`, ya sin el prefijo. */
    token?: string;
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

/** La administración: usuarios, y escribir abogados (V3 D-39). */
function requireAdmin(request: MockRequest): AuthResult {
    return requireRole(request, 'ADMINISTRATOR');
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

function registrationTaken(registrationNumber: string, exceptId?: number): boolean {
    return db.lawyers.some((l) => l.id !== exceptId && l.registrationNumber === registrationNumber);
}

const createUser: Handler = ({ request }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const body = asObject(request.body);
    const username = asText(body.username);
    const fullName = asText(body.fullName);
    const email = asText(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const roles = normalizeRoles(body.roles);

    const details: Record<string, string> = {};
    if (!RE_USERNAME.test(username)) {
        details.username = 'El nombre de usuario no cumple con el formato requerido.';
    }
    if (fullName === '') details.fullName = 'El nombre y apellido es obligatorio.';
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
        const lawyerFullName = asText(inline.fullName);
        const registrationNumber = asText(inline.registrationNumber);

        const lawyerDetails: Record<string, string> = {};
        if (lawyerFullName === '') lawyerDetails['lawyer.fullName'] = 'El nombre y apellido es obligatorio.';
        if (!RE_REGISTRATION.test(registrationNumber)) {
            lawyerDetails['lawyer.registrationNumber'] = 'El formato de la matrícula no es válido.';
        }
        if (Object.keys(lawyerDetails).length > 0) return validationError(lawyerDetails);

        if (registrationTaken(registrationNumber)) return fail(409, ERRORS.registrationTaken);

        newLawyer = {
            id: db.nextLawyerId,
            fullName: lawyerFullName,
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
        fullName,
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
        .filter((u) => (search === '' ? true : contains(u.username, search) || contains(u.fullName, search)))
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
    const hasFullName = body.fullName !== undefined;
    const hasEmail = body.email !== undefined;
    const hasRoles = body.roles !== undefined;
    const hasLawyerId = body.lawyerId !== undefined;

    if (!hasUsername && !hasFullName && !hasEmail && !hasRoles && !hasLawyerId) {
        return validationError({ body: 'Debe enviarse al menos un campo para modificar.' });
    }

    const details: Record<string, string> = {};
    const username = asText(body.username);
    const fullName = asText(body.fullName);
    const email = asText(body.email);

    if (hasUsername && !RE_USERNAME.test(username)) {
        details.username = 'El nombre de usuario no cumple con el formato requerido.';
    }
    if (hasFullName && fullName === '') details.fullName = 'El nombre y apellido es obligatorio.';
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
    if (hasFullName) user.fullName = fullName;
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
    const fullName = asText(body.fullName);
    const registrationNumber = asText(body.registrationNumber);

    const details: Record<string, string> = {};
    if (fullName === '') details.fullName = 'El nombre y apellido es obligatorio.';
    if (!RE_REGISTRATION.test(registrationNumber)) {
        details.registrationNumber = 'El formato de la matrícula no es válido.';
    }
    if (Object.keys(details).length > 0) return validationError(details);

    if (registrationTaken(registrationNumber)) return fail(409, ERRORS.registrationTaken);

    const lawyer: Lawyer = {
        id: db.nextLawyerId,
        fullName,
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
            search === '' ? true : contains(l.fullName, search) || contains(l.registrationNumber, search),
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
    const hasFullName = body.fullName !== undefined;
    const hasRegistration = body.registrationNumber !== undefined;
    if (!hasFullName && !hasRegistration) {
        return validationError({ body: 'Debe enviarse al menos un campo para modificar.' });
    }

    const details: Record<string, string> = {};
    const fullName = asText(body.fullName);
    const registrationNumber = asText(body.registrationNumber);

    if (hasFullName && fullName === '') details.fullName = 'El nombre y apellido es obligatorio.';
    if (hasRegistration && !RE_REGISTRATION.test(registrationNumber)) {
        details.registrationNumber = 'El formato de la matrícula no es válido.';
    }
    if (Object.keys(details).length > 0) return validationError(details);

    const lawyer = db.lawyers.find((l) => l.id === lawyerId && l.active);
    if (!lawyer) return fail(404, ERRORS.lawyerNotFound);

    if (hasRegistration && registrationTaken(registrationNumber, lawyerId)) {
        return fail(409, ERRORS.registrationTaken);
    }

    if (hasFullName) lawyer.fullName = fullName;
    if (hasRegistration) lawyer.registrationNumber = registrationNumber;

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

/** DNI: 7 u 8 dígitos, sin puntos (V3 D-17). */
const RE_DNI = /^\d{7,8}$/;

/** Único entre los clientes vigentes: uno dado de baja libera su DNI. */
function dniTaken(dni: string): boolean {
    return db.clients.some((c) => c.active && c.dni === dni);
}

const createClient: Handler = ({ request }) => {
    // Administrar clientes es de los tres perfiles (V3 D-39).
    const auth = requireUser(request);
    if (!auth.ok) return auth.response;

    const body = asObject(request.body);
    const lastName = asText(body.lastName);
    const firstName = asText(body.firstName);
    const dni = asText(body.dni);
    const phone = optionalText(body.phone);
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
    if (!RE_DNI.test(dni)) details.dni = 'Debe contener 7 u 8 dígitos, sin puntos.';
    if (phone !== null && phone.length > CLIENT_PHONE_MAX) {
        details.phone = `Puede tener hasta ${CLIENT_PHONE_MAX} caracteres.`;
    }
    if (email !== null && !RE_EMAIL.test(email)) {
        details.email = 'El formato del correo electrónico no es válido.';
    }
    if (Object.keys(details).length > 0) return validationError(details);

    if (dniTaken(dni)) return fail(409, ERRORS.clientDniTaken);

    // El backend guarda apellido y nombres tal como llegan; la fecha de alta
    // la pone él.
    const client: StoredClient = {
        id: db.nextClientId,
        lastName,
        firstName,
        dni,
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
    // El DNI se busca como se guarda: quien escribe "34.812" busca "34812".
    const digits = search.replace(/[.\s]/g, '');
    const filtered = db.clients
        .filter((c) => c.active)
        .filter((c) =>
            search === ''
                ? true
                : contains(c.lastName, search) ||
                  contains(c.firstName, search) ||
                  (/^\d+$/.test(digits) && c.dni.includes(digits)),
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
       sin él no se manda. Sin SAC se guarda la del día, como el backend, que
       todavía no admite la columna vacía. */
    let startDate = today;
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

    if (Object.keys(details).length > 0) return validationError(details);

    /* Si se informa, el SAC identifica la causa en todo el sistema (RN2),
       incluidas las dadas de baja. Dos causas sin SAC no chocan entre sí. */
    if (sacNumber !== null && db.cases.some((c) => c.sacNumber === sacNumber)) {
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
        clientId: clientId as number,
        responsibleLawyerId: lawyerId as number,
        qualifications,
        startDate,
        active: true,
    };
    db.nextCaseId += 1;
    db.cases.push(stored);

    /* No se crea ningún acto: la causa nace en el estado inicial, "Iniciada",
       y sin vencimiento. El estado de la tabla lo fija el primer acto (D-34). */
    return created(itemBody(toCase(stored)));
};

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
            // Sin actos, la causa sigue en el estado inicial, "Iniciada" (D-34).
            if (byWithoutActs) return latest === undefined;
            if (byStateId) return latest?.proceduralStateId === stateId.value;
            if (byCustomState) {
                return latest?.customState?.toLowerCase() === customState.toLowerCase();
            }
            return true;
        })
        .map(toCase)
        // "Solo con plazo por vencer": las que tienen vencimiento, vencidas incluidas.
        .filter((c) => (onlyOpen ? c.currentState.dueDate !== null : true))
        .filter((c) =>
            search === ''
                ? true
                : (c.sacNumber !== null && contains(c.sacNumber, search)) ||
                  contains(c.caption, search) ||
                  // En los dos órdenes: "gómez, ariel" y "ariel gómez".
                  contains(`${c.client.lastName}, ${c.client.firstName}`, search) ||
                  contains(`${c.client.firstName} ${c.client.lastName}`, search),
        )
        /* Por urgencia (D-25 y D-35): primero las causas con vencimiento, por
           `currentState.dueDate` ascendente —las vencidas quedan arriba—, y
           después las que no tienen, por `id`. Ya no se desempata por SAC,
           que puede faltar. */
        .sort((a, b) => {
            const dueA = a.currentState.dueDate;
            const dueB = b.currentState.dueDate;
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

const MSG_STATE_NOT_ALLOWED = 'El estado procesal no pertenece al fuero de la causa o es terminal.';
const MSG_NOTIFICATION_REQUIRED =
    'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).';

/**
 * El estado de la tabla al que un acto puede llevar la causa: vigente, del
 * fuero de la causa y **no terminal** (V3 D-15). `undefined` si no sirve.
 */
function allowedTargetState(stateId: number | undefined, jurisdiction: Jurisdiction) {
    if (stateId === undefined) return undefined;
    return db.proceduralStates.find(
        (s) => s.id === stateId && s.active && s.jurisdiction === jurisdiction && !s.terminal,
    );
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
    if (isPresent(body.manualDueDate)) {
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

    { method: 'POST', path: '/cases/:caseId/procedural-acts', pattern: /^\/cases\/(?<caseId>[^/]+)\/procedural-acts$/, handler: createProceduralAct },
    { method: 'GET', path: '/cases/:caseId/procedural-acts/deadline-preview', pattern: /^\/cases\/(?<caseId>[^/]+)\/procedural-acts\/deadline-preview$/, handler: previewDeadline },
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
