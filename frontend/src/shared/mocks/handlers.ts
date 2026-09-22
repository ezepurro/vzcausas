/**
 * Servidor falso: implementa los dieciocho endpoints del contrato sobre la
 * base en memoria de `db.ts`.
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
    ROLES,
    type DayType,
    type Jurisdiction,
    type Lawyer,
    type ProceduralState,
    type Role,
    permissionsFor,
    type RefreshedSession,
    type Session,
} from './contract';
import {
    db,
    issueToken,
    revokeToken,
    revokeUserSessions,
    toUser,
    userForRenewal,
    userFromToken,
} from './db';
import {
    EXPIRES_IN,
    LAWYERS_WITH_DEPENDENCIES,
    PROCEDURAL_STATES_WITH_DEPENDENCIES,
    PROTECTED_ADMIN_USER,
    USERS_WITH_DEPENDENCIES,
    type StoredUser,
} from './fixtures';
import { businessRuleViolation, ERRORS, NO_CONTENT, type MockResponse } from './responses';

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

function fail(status: number, body: unknown): MockResponse {
    return { status, body };
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
 * Exige sesión válida **y** rol administrador.
 *
 * Vale tanto para leer como para escribir: el contrato pide `ADMINISTRATOR`
 * en los tres recursos administrados, también en los `GET`.
 */
function requireAdmin(request: MockRequest): AuthResult {
    const user = userFromToken(request.token);
    if (!user) return { ok: false, response: fail(401, ERRORS.unauthenticated) };
    if (!user.roles.includes('ADMINISTRATOR')) {
        return { ok: false, response: fail(403, ERRORS.forbidden) };
    }
    return { ok: true, user };
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

const login: Handler = ({ request }) => {
    const body = asObject(request.body);
    const username = asText(body.username);
    const password = typeof body.password === 'string' ? body.password : '';

    const details: Record<string, string> = {};
    if (username === '') details.username = 'El nombre de usuario es obligatorio.';
    if (password === '') details.password = 'La contraseña es obligatoria.';
    if (Object.keys(details).length > 0) return validationError(details);

    const user = db.users.find((u) => u.username === username);
    // Un usuario dado de baja no entra, y no se distingue de credenciales
    // incorrectas: decirle "existís pero estás inactivo" filtra información.
    if (!user || !user.active || db.passwords.get(user.username) !== password) {
        return fail(401, ERRORS.invalidCredentials);
    }

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
            roleNames: [...user.roles],
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

    return created(itemBody(lawyer));
};

const listLawyers: Handler = ({ request }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const page = readPagination(request.query);
    if (!page.ok) return page.response;

    const search = asText(request.query.get('search'));
    const filtered = db.lawyers
        .filter((l) => l.active)
        .filter((l) =>
            search === '' ? true : contains(l.fullName, search) || contains(l.registrationNumber, search),
        )
        .sort((a, b) => a.id - b.id);

    return ok(paginate(filtered, page.page, page.limit));
};

const getLawyer: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const lawyerId = readRouteId(params, 'lawyerId');
    if (lawyerId === undefined) return fail(400, ERRORS.invalidLawyerId);

    const lawyer = db.lawyers.find((l) => l.id === lawyerId && l.active);
    if (!lawyer) return fail(404, ERRORS.lawyerNotFound);

    return ok(itemBody(lawyer));
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

    return ok(itemBody(lawyer));
};

const deleteLawyer: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const lawyerId = readRouteId(params, 'lawyerId');
    if (lawyerId === undefined) return fail(400, ERRORS.invalidLawyerId);

    const lawyer = db.lawyers.find((l) => l.id === lawyerId && l.active);
    if (!lawyer) return fail(404, ERRORS.lawyerNotFound);

    const linked = db.users.some((u) => u.active && u.lawyerId === lawyerId);
    if (LAWYERS_WITH_DEPENDENCIES.includes(lawyerId) || linked) {
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
 */
function stateNameTaken(name: string, jurisdiction: Jurisdiction, exceptId?: number): boolean {
    return db.proceduralStates.some(
        (s) =>
            s.id !== exceptId &&
            s.jurisdiction === jurisdiction &&
            s.name.toLowerCase() === name.toLowerCase(),
    );
}

/** Los estados activos de un fuero, en orden de ciclo de vida. */
function statesOf(jurisdiction: Jurisdiction, exceptId?: number): ProceduralState[] {
    return db.proceduralStates
        .filter((s) => s.active && s.jurisdiction === jurisdiction && s.id !== exceptId)
        .sort((a, b) => a.position - b.position);
}

/**
 * Renumera las posiciones de un fuero para que queden 1..n sin huecos.
 *
 * Se llama después de insertar, de mover y de dar de baja: el contrato dice
 * que el backend renumera y que el cliente no manda esa renumeración.
 */
function renumber(jurisdiction: Jurisdiction): void {
    statesOf(jurisdiction).forEach((state, index) => {
        state.position = index + 1;
    });
}

/** El `dayType` tiene que ser coherente con el plazo. */
function dayTypeMismatch(timeLimitDays: number, dayType: DayType): boolean {
    return (timeLimitDays === 0) !== (dayType === 'NONE');
}

const createProceduralState: Handler = ({ request }) => {
    const auth = requireAdmin(request);
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

    const position = body.position === undefined ? undefined : readCount(body.position, 9999);
    if (body.position !== undefined && (position === undefined || position < 1)) {
        details.position = 'Debe ser un número entero mayor o igual a 1.';
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

    /* Insertar corre un lugar a los que vienen después. Sin posición, va al
       final del ciclo. */
    const siblings = statesOf(jurisdiction);
    const target = Math.min(position ?? siblings.length + 1, siblings.length + 1);

    const state: ProceduralState = {
        id: db.nextProceduralStateId,
        name,
        jurisdiction,
        position: target,
        timeLimitDays: days,
        dayType,
        terminal: body.terminal === true,
        activeCases: 0,
        active: true,
    };
    db.nextProceduralStateId += 1;

    for (const sibling of siblings) {
        if (sibling.position >= target) sibling.position += 1;
    }
    db.proceduralStates.push(state);
    renumber(jurisdiction);

    return created(itemBody(state));
};

const listProceduralStates: Handler = ({ request }) => {
    const auth = requireAdmin(request);
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
           posición. La pantalla muestra el ciclo de vida en orden. */
        .sort((a, b) =>
            a.jurisdiction === b.jurisdiction
                ? a.position - b.position
                : JURISDICTIONS.indexOf(a.jurisdiction) - JURISDICTIONS.indexOf(b.jurisdiction),
        );

    return ok(paginate(filtered, page.page, page.limit));
};

const getProceduralState: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const stateId = readRouteId(params, 'stateId');
    if (stateId === undefined) return fail(400, ERRORS.invalidProceduralStateId);

    const state = db.proceduralStates.find((s) => s.id === stateId && s.active);
    if (!state) return fail(404, ERRORS.proceduralStateNotFound);

    return ok(itemBody(state));
};

const updateProceduralState: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const stateId = readRouteId(params, 'stateId');
    if (stateId === undefined) return fail(400, ERRORS.invalidProceduralStateId);

    const body = asObject(request.body);
    const hasName = body.name !== undefined;
    const hasPosition = body.position !== undefined;
    const hasTimeLimit = body.timeLimitDays !== undefined;
    const hasDayType = body.dayType !== undefined;
    const hasTerminal = body.terminal !== undefined;
    if (!hasName && !hasPosition && !hasTimeLimit && !hasDayType && !hasTerminal) {
        return validationError({ body: 'Debe enviarse al menos un campo para modificar.' });
    }

    const details: Record<string, string> = {};
    const name = asText(body.name);
    if (hasName && !isValidStateName(name)) {
        details.name = `Debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres.`;
    }

    /* El fuero no se puede cambiar: el contrato lo dice explícitamente. Un
       estado que se muda de fuero rompería el ciclo de vida de los dos. */
    if (body.jurisdiction !== undefined) {
        details.jurisdiction = 'El fuero de un estado procesal no se puede modificar.';
    }

    const timeLimitDays = hasTimeLimit ? readCount(body.timeLimitDays, 9999) : undefined;
    if (hasTimeLimit && timeLimitDays === undefined) {
        details.timeLimitDays = 'Debe ser un número entero entre 0 y 9999.';
    }
    if (hasDayType && !isDayType(body.dayType)) {
        details.dayType = 'Debe ser BUSINESS, CONSECUTIVE o NONE.';
    }
    const position = hasPosition ? readCount(body.position, 9999) : undefined;
    if (hasPosition && (position === undefined || position < 1)) {
        details.position = 'Debe ser un número entero mayor o igual a 1.';
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

    /* Mover un estado reordena el ciclo: se lo saca de su lugar, se lo mete
       en el nuevo y se renumera todo el fuero. */
    if (hasPosition) {
        const siblings = statesOf(state.jurisdiction, stateId);
        const target = Math.min(position as number, siblings.length + 1);
        siblings.splice(target - 1, 0, state);
        siblings.forEach((s, index) => {
            s.position = index + 1;
        });
    } else {
        renumber(state.jurisdiction);
    }

    return ok(itemBody(state));
};

const deleteProceduralState: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const stateId = readRouteId(params, 'stateId');
    if (stateId === undefined) return fail(400, ERRORS.invalidProceduralStateId);

    const state = db.proceduralStates.find((s) => s.id === stateId && s.active);
    if (!state) return fail(404, ERRORS.proceduralStateNotFound);

    if (PROCEDURAL_STATES_WITH_DEPENDENCIES.includes(stateId)) {
        return fail(409, ERRORS.proceduralStateHasDependencies);
    }

    state.active = false;
    // Los que quedan se renumeran: el ciclo no puede tener huecos.
    renumber(state.jurisdiction);

    return NO_CONTENT;
};

/* ------------------------------------------------------------------ */
/* Tabla de rutas                                                      */
/* ------------------------------------------------------------------ */

interface Route {
    method: HttpMethod;
    pattern: RegExp;
    handler: Handler;
}

const ROUTES: Route[] = [
    { method: 'POST', pattern: /^\/auth\/login$/, handler: login },
    { method: 'POST', pattern: /^\/auth\/refresh$/, handler: refresh },
    { method: 'POST', pattern: /^\/auth\/logout$/, handler: logout },
    { method: 'PATCH', pattern: /^\/auth\/password$/, handler: changePassword },

    { method: 'POST', pattern: /^\/users$/, handler: createUser },
    { method: 'GET', pattern: /^\/users$/, handler: listUsers },
    { method: 'GET', pattern: /^\/users\/(?<userId>[^/]+)$/, handler: getUser },
    { method: 'PATCH', pattern: /^\/users\/(?<userId>[^/]+)$/, handler: updateUser },
    { method: 'DELETE', pattern: /^\/users\/(?<userId>[^/]+)$/, handler: deleteUser },

    { method: 'POST', pattern: /^\/lawyers$/, handler: createLawyer },
    { method: 'GET', pattern: /^\/lawyers$/, handler: listLawyers },
    { method: 'GET', pattern: /^\/lawyers\/(?<lawyerId>[^/]+)$/, handler: getLawyer },
    { method: 'PATCH', pattern: /^\/lawyers\/(?<lawyerId>[^/]+)$/, handler: updateLawyer },
    { method: 'DELETE', pattern: /^\/lawyers\/(?<lawyerId>[^/]+)$/, handler: deleteLawyer },

    { method: 'POST', pattern: /^\/procedural-states$/, handler: createProceduralState },
    { method: 'GET', pattern: /^\/procedural-states$/, handler: listProceduralStates },
    { method: 'GET', pattern: /^\/procedural-states\/(?<stateId>[^/]+)$/, handler: getProceduralState },
    { method: 'PATCH', pattern: /^\/procedural-states\/(?<stateId>[^/]+)$/, handler: updateProceduralState },
    { method: 'DELETE', pattern: /^\/procedural-states\/(?<stateId>[^/]+)$/, handler: deleteProceduralState },
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

/** Las rutas implementadas, para documentación o para un panel de debug. */
export const IMPLEMENTED_ENDPOINTS = ROUTES.map((r) => `${r.method} ${r.pattern.source}`);
