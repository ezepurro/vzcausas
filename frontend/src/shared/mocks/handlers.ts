/**
 * Servidor falso: implementa los diez endpoints del contrato v1 sobre la
 * base en memoria de `db.ts`.
 *
 * Es una función pura respecto del transporte (`resolveRequest`): recibe un
 * pedido ya normalizado y devuelve `{ status, body }`. No sabe de axios ni de
 * fetch — de eso se encarga `adapter.ts`—, así que también se puede llamar
 * directo desde un test.
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
 * 6. `409` unicidad
 * 7. `422` regla de negocio
 *
 * El contrato no fija ese orden; es una decisión del mock para que el
 * comportamiento sea previsible.
 */

import {
    buildPagination,
    errorBody,
    itemBody,
    listBody,
    sessionRoleFrom,
    DEFAULT_LIMIT,
    DEFAULT_PAGE,
    JURISDICTIONS,
    MAX_LIMIT,
    MIN_LIMIT,
    ROLES,
    type Jurisdiction,
    type Lawyer,
    type ProceduralState,
    type Role,
    type Session,
    type User,
} from './contract';
import { db, issueToken, revokeToken, userFromToken } from './db';
import { EXPIRES_IN, PROTECTED_ADMIN_USER, USERS_WITH_DEPENDENCIES } from './fixtures';
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

type AuthResult = { ok: true; user: User } | { ok: false; response: MockResponse };

/** Sólo exige sesión válida; sirve para los endpoints de `/auth`. */
function requireSession(request: MockRequest): AuthResult {
    const user = userFromToken(request.token);
    if (!user) return { ok: false, response: fail(401, ERRORS.unauthenticatedAuth) };
    return { ok: true, user };
}

/**
 * Exige sesión válida **y** rol administrador.
 *
 * `forbiddenBody` existe porque el contrato redacta el 403 distinto en
 * `POST /users` que en el resto.
 */
function requireAdmin(request: MockRequest, forbiddenBody = ERRORS.forbiddenNotAdmin): AuthResult {
    const user = userFromToken(request.token);
    if (!user) return { ok: false, response: fail(401, ERRORS.unauthenticated) };
    if (!user.role.includes('ADMINISTATOR')) {
        return { ok: false, response: fail(403, forbiddenBody) };
    }
    return { ok: true, user };
}

/* ------------------------------------------------------------------ */
/* Validación                                                          */
/* ------------------------------------------------------------------ */

/**
 * Formato de `username`. El contrato no lo define —sólo dice "no cumple con
 * el formato requerido"—, así que el mock elige uno razonable: 3 a 30
 * caracteres, letras, números, punto, guion y guion bajo.
 */
const RE_USERNAME = /^[a-z0-9._-]{3,30}$/i;

/** Matrícula profesional: `MP-` y 4 a 6 dígitos, como el `MP-12345` del contrato. */
const RE_REGISTRATION = /^MP-\d{4,6}$/;

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Teléfono: sólo dígitos, 6 a 15, como el `351249249` del contrato. */
const RE_PHONE = /^\d{6,15}$/;

/** Requisito de contraseña elegido por el mock: 8+ caracteres, con letra y número. */
function isValidPassword(value: string): boolean {
    return value.length >= 8 && /[a-z]/i.test(value) && /\d/.test(value);
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

/**
 * Normaliza el campo `role`, que el contrato manda a veces como arreglo y a
 * veces como string suelto. Devuelve `undefined` si hay algún valor inválido.
 */
function normalizeRoles(value: unknown): Role[] | undefined {
    const list = Array.isArray(value) ? value : [value];
    if (list.length === 0) return undefined;
    if (!list.every(isRole)) return undefined;
    // Sin repetidos: ["LAWYER","LAWYER"] no tiene sentido como rol.
    return [...new Set(list)];
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
    if (!user || db.passwords.get(user.username) !== password) {
        // DIVERGENCIA: este 401 no usa el envoltorio estándar (ver contract.ts).
        return fail(401, { statusCode: 401, error: 'Unauthorized', message: 'Credenciales inválidas' });
    }

    const session: Session = {
        accessToken: issueToken(user.id),
        tokenType: 'Bearer',
        expiresIn: EXPIRES_IN,
        user: { id: user.id, username: user.username, role: sessionRoleFrom(user.role) },
    };
    return ok(itemBody(session));
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

const createUser: Handler = ({ request }) => {
    // Este endpoint es el único cuyo 403 habla de "permisos suficientes".
    const auth = requireAdmin(request, ERRORS.forbiddenNoPermissions);
    if (!auth.ok) return auth.response;

    const body = asObject(request.body);
    const username = asText(body.username);
    const password = typeof body.password === 'string' ? body.password : '';
    const roles = normalizeRoles(body.role);

    const details: Record<string, string> = {};
    if (!RE_USERNAME.test(username)) {
        details.username = 'El nombre de usuario no cumple con el formato requerido.';
    }
    if (!isValidPassword(password)) {
        details.password = 'La contraseña no cumple con los requisitos establecidos.';
    }
    if (!roles) details.role = 'Debe indicarse al menos un rol válido.';
    if (Object.keys(details).length > 0) return validationError(details);

    if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        return fail(409, ERRORS.usernameTaken);
    }

    // Regla de negocio del mock: un usuario LAWYER necesita un abogado que exista.
    const lawyerId = body.abogadoId === undefined ? undefined : Number(body.abogadoId);
    if ((roles as Role[]).includes('LAWYER')) {
        const exists = lawyerId !== undefined && db.lawyers.some((l) => l.id === lawyerId);
        if (!exists) return fail(422, businessRuleViolation('createUser'));
    }

    const user: User = { id: db.nextUserId, username, role: roles as Role[] };
    db.nextUserId += 1;
    db.users.push(user);
    db.passwords.set(username, password);
    if (lawyerId !== undefined) db.userLawyer.set(user.id, lawyerId);

    return created(itemBody(user));
};

const listUsers: Handler = ({ request }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const page = readPagination(request.query);
    if (!page.ok) return page.response;

    const role = request.query.get('role');
    if (role !== null && role !== '' && !isRole(role)) {
        // El contrato no documenta este error para /users (sí el análogo de
        // jurisdiction en /procedural-states). Se replica ese formato.
        return fail(400, errorBody('INVALID_REQUEST', 'Parametros de query inválidos', {
            role: 'No existe un rol con ese nombre',
        }));
    }

    const search = asText(request.query.get('search'));
    const filtered = db.users
        .filter((u) => (search === '' ? true : contains(u.username, search)))
        .filter((u) => (role === null || role === '' ? true : u.role.includes(role as Role)))
        .sort((a, b) => a.id - b.id);

    return ok(paginate(filtered, page.page, page.limit));
};

/** `userId` de la ruta. `undefined` si no es un entero. */
function readUserId(params: Record<string, string>): number | undefined {
    const raw = params.userId ?? '';
    if (!/^\d+$/.test(raw)) return undefined;
    return Number(raw);
}

const getUser: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const userId = readUserId(params);
    if (userId === undefined) return fail(400, ERRORS.invalidUserId);

    const user = db.users.find((u) => u.id === userId);
    if (!user) return fail(404, ERRORS.userNotFound);

    return ok(itemBody(user));
};

const updateUser: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const userId = readUserId(params);
    if (userId === undefined) return fail(400, ERRORS.invalidUserId);

    const body = asObject(request.body);
    const hasUsername = body.username !== undefined;
    const hasRole = body.role !== undefined;
    if (!hasUsername && !hasRole) {
        return validationError({ body: 'Debe enviarse al menos un campo para modificar.' });
    }

    const details: Record<string, string> = {};
    const username = asText(body.username);
    if (hasUsername && !RE_USERNAME.test(username)) {
        details.username = 'El nombre de usuario no cumple con el formato requerido.';
    }
    const roles = hasRole ? normalizeRoles(body.role) : undefined;
    if (hasRole && !roles) details.role = 'Debe indicarse al menos un rol válido.';
    if (Object.keys(details).length > 0) return validationError(details);

    const user = db.users.find((u) => u.id === userId);
    if (!user) return fail(404, ERRORS.userNotFound);

    if (
        hasUsername &&
        db.users.some((u) => u.id !== userId && u.username.toLowerCase() === username.toLowerCase())
    ) {
        return fail(409, ERRORS.usernameTaken);
    }

    // Regla de negocio del mock: el sistema conserva siempre un administrador.
    const losesAdmin = roles !== undefined && !roles.includes('ADMINISTATOR');
    if (userId === PROTECTED_ADMIN_USER && losesAdmin) {
        return fail(422, businessRuleViolation('updateUser'));
    }

    if (hasUsername) {
        const password = db.passwords.get(user.username);
        db.passwords.delete(user.username);
        if (password !== undefined) db.passwords.set(username, password);
        user.username = username;
    }
    if (roles) user.role = roles;

    return ok(itemBody(user));
};

const deleteUser: Handler = ({ request, params }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const userId = readUserId(params);
    if (userId === undefined) return fail(400, ERRORS.invalidUserId);

    const index = db.users.findIndex((u) => u.id === userId);
    if (index === -1) return fail(404, ERRORS.userNotFound);

    if (USERS_WITH_DEPENDENCIES.includes(userId)) {
        return fail(409, ERRORS.userHasDependencies);
    }
    if (userId === PROTECTED_ADMIN_USER) {
        return fail(422, businessRuleViolation('deleteUser'));
    }

    const [removed] = db.users.splice(index, 1);
    db.passwords.delete(removed.username);
    db.userLawyer.delete(userId);
    // Se caen también sus sesiones abiertas.
    for (const [token, id] of db.sessions) {
        if (id === userId) db.sessions.delete(token);
    }

    return NO_CONTENT;
};

/* ------------------------------------------------------------------ */
/* /lawyers                                                            */
/* ------------------------------------------------------------------ */

const createLawyer: Handler = ({ request }) => {
    const auth = requireAdmin(request);
    if (!auth.ok) return auth.response;

    const body = asObject(request.body);
    const firstName = asText(body.firstName);
    const lastName = asText(body.lastName);
    const registrationNumber = asText(body.registrationNumber);
    const email = asText(body.email);
    const phone = asText(body.phone);

    const details: Record<string, string> = {};
    if (firstName === '') details.firstName = 'El nombre es obligatorio.';
    if (lastName === '') details.lastName = 'El apellido es obligatorio.';
    if (!RE_REGISTRATION.test(registrationNumber)) {
        details.registrationNumber = 'El formato de la matrícula no es válido.';
    }
    if (!RE_EMAIL.test(email)) details.email = 'El correo electrónico no es válido.';
    if (!RE_PHONE.test(phone)) details.phone = 'El teléfono no es válido.';
    if (Object.keys(details).length > 0) return validationError(details);

    if (db.lawyers.some((l) => l.registrationNumber === registrationNumber)) {
        return fail(409, ERRORS.registrationTaken);
    }

    // Regla de negocio del mock: el correo tampoco se puede repetir, pero el
    // contrato no le da un código propio, así que cae en el 422 genérico.
    if (db.lawyers.some((l) => l.email.toLowerCase() === email.toLowerCase())) {
        return fail(422, businessRuleViolation('createLawyer'));
    }

    const lawyer: Lawyer = {
        id: db.nextLawyerId,
        firstName,
        lastName,
        registrationNumber,
        email,
        phone,
    };
    db.nextLawyerId += 1;
    db.lawyers.push(lawyer);

    return created(itemBody(lawyer));
};

/* ------------------------------------------------------------------ */
/* /procedural-states                                                  */
/* ------------------------------------------------------------------ */

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
    const filtered: ProceduralState[] = db.proceduralStates
        .filter((s) => (search === '' ? true : contains(s.name, search)))
        .filter((s) => (jurisdiction === null || jurisdiction === '' ? true : s.jurisdiction === jurisdiction))
        .sort((a, b) => a.id - b.id);

    return ok(paginate(filtered, page.page, page.limit));
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
    { method: 'POST', pattern: /^\/auth\/logout$/, handler: logout },
    { method: 'PATCH', pattern: /^\/auth\/password$/, handler: changePassword },
    { method: 'POST', pattern: /^\/users$/, handler: createUser },
    { method: 'GET', pattern: /^\/users$/, handler: listUsers },
    { method: 'GET', pattern: /^\/users\/(?<userId>[^/]+)$/, handler: getUser },
    { method: 'PATCH', pattern: /^\/users\/(?<userId>[^/]+)$/, handler: updateUser },
    { method: 'DELETE', pattern: /^\/users\/(?<userId>[^/]+)$/, handler: deleteUser },
    { method: 'POST', pattern: /^\/lawyers$/, handler: createLawyer },
    { method: 'GET', pattern: /^\/procedural-states$/, handler: listProceduralStates },
];

/**
 * Resuelve un pedido contra el contrato.
 *
 * Una ruta que no está en la tabla devuelve el `404 RESOURCE_NOT_FOUND`
 * general de §4.2, con el método y la ruta en el mensaje para que se note
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
        errorBody('RESOURCE_NOT_FOUND', `${request.method} ${request.path} no existe en el contrato v1.`),
    );
}

/** Las rutas implementadas, para documentación o para un panel de debug. */
export const IMPLEMENTED_ENDPOINTS = ROUTES.map((r) => `${r.method} ${r.pattern.source}`);
