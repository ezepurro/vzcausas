/**
 * Forma de los errores de la API, según `docs/Api-Contract/API_CONTRACT_V3.md`
 * §5.2 y §5.3.
 *
 * Vive en `api/` y no en `mocks/` porque es contrato de producción: lo usa
 * `http.ts` para parsear y `ApiError` para exponerlo. Los mocks lo importan
 * desde acá, no al revés.
 */

/**
 * Códigos de error documentados (catálogo de V3 §5.3).
 *
 * `PROCEDURAL_STATE_HAS_DEPENDENCIES` no está: V3 lo retiró, porque la baja de
 * un estado procesal ya no se rechaza por tener causas (D-06).
 * `LAWYER_ALREADY_LINKED` no figura en el catálogo pero el backend lo emite al
 * vincular un abogado que ya tiene cuenta.
 *
 * El contrato pide que los códigos sean **generales**, así que esta lista es
 * cerrada a propósito: si el backend manda uno que no está, `ApiError.code`
 * igual lo conserva como string —no se pierde información— pero no va a
 * aparecer en el autocompletado de `is()`.
 */
export const ERROR_CODES = [
    // 400 — datos o parámetros inválidos
    'VALIDATION_ERROR',
    'INVALID_PAGINATION',
    'INVALID_PATH_PARAMETER',
    'INVALID_REQUEST',
    'SAME_PASSWORD',
    // 401 — sin identidad
    'INVALID_CREDENTIALS',
    'UNAUTHENTICATED',
    // 403 — con identidad, sin permiso suficiente
    'FORBIDDEN',
    // 404 — el recurso no existe
    'USER_NOT_FOUND',
    'LAWYER_NOT_FOUND',
    'PROCEDURAL_STATE_NOT_FOUND',
    'LEGAL_QUALIFICATION_NOT_FOUND',
    'CLIENT_NOT_FOUND',
    'CASE_NOT_FOUND',
    'RESOURCE_NOT_FOUND',
    // 409 — unicidad y dependencias
    'USERNAME_ALREADY_EXISTS',
    'EMAIL_ALREADY_EXISTS',
    'LAWYER_REGISTRATION_ALREADY_EXISTS',
    'LAWYER_ALREADY_LINKED',
    'PROCEDURAL_STATE_ALREADY_EXISTS',
    'LEGAL_QUALIFICATION_ALREADY_EXISTS',
    'CLIENT_DNI_ALREADY_EXISTS',
    'CASE_SAC_ALREADY_EXISTS',
    'USER_HAS_DEPENDENCIES',
    'LAWYER_HAS_DEPENDENCIES',
    // 422 — regla de negocio
    'INVALID_CURRENT_PASSWORD',
    'CASE_IN_TERMINAL_STATE',
    'BUSINESS_RULE_VIOLATION',
    // 429 — límite de frecuencia
    'TOO_MANY_LOGIN_ATTEMPTS',
    'TOO_MANY_REQUESTS',
    // 500
    'INTERNAL_SERVER_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(value: unknown): value is ErrorCode {
    return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}

/**
 * Cuerpo de error estándar. Todas las respuestas de error usan esta forma,
 * con una sola excepción (ver `LoginErrorBody`).
 *
 * ```json
 * {
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Los datos enviados no son válidos.",
 *     "details": { "username": "El nombre de usuario es obligatorio." }
 *   }
 * }
 * ```
 *
 * `details` es un objeto campo → mensaje en los errores de validación y
 * `null` en el resto. Única excepción: `TOO_MANY_LOGIN_ATTEMPTS` y
 * `TOO_MANY_REQUESTS` traen `{ retryAfterSeconds: number }` — no es un
 * mensaje de campo, por eso el tipo lo separa en vez de forzarlo a string.
 */
export interface ErrorBody {
    error: {
        code: ErrorCode;
        message: string;
        details: Record<string, string> | { retryAfterSeconds: number } | null;
    };
}

/**
 * Cuerpo del `401` de `POST /auth/login`.
 *
 * CONTRATO ANTERIOR: ya no se usa. El login responde con el envoltorio
 * estándar y el código `INVALID_CREDENTIALS`. El tipo se conserva porque
 * `http.ts` mantiene la rama que lo parsea como red de seguridad.
 */
export interface LoginErrorBody {
    statusCode: 401;
    error: 'Unauthorized';
    message: string;
}
