/**
 * Forma de los errores de la API, según `docs/api contract v1.md` §4.2.
 *
 * Vive en `api/` y no en `mocks/` porque es contrato de producción: lo usa
 * `http.ts` para parsear y `ApiError` para exponerlo. Los mocks lo importan
 * desde acá, no al revés.
 */

/**
 * Códigos de error documentados (§2 y §4.2).
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
    // 401 — sin identidad
    'INVALID_CREDENTIALS',
    'UNAUTHENTICATED',
    // 403 — con identidad, sin permiso suficiente
    'FORBIDDEN',
    // 404 — el recurso no existe
    'USER_NOT_FOUND',
    'LAWYER_NOT_FOUND',
    'PROCEDURAL_STATE_NOT_FOUND',
    'RESOURCE_NOT_FOUND',
    // 409 — unicidad y dependencias
    'USERNAME_ALREADY_EXISTS',
    'EMAIL_ALREADY_EXISTS',
    'LAWYER_REGISTRATION_ALREADY_EXISTS',
    'PROCEDURAL_STATE_ALREADY_EXISTS',
    'USER_HAS_DEPENDENCIES',
    'LAWYER_HAS_DEPENDENCIES',
    'PROCEDURAL_STATE_HAS_DEPENDENCIES',
    // 422 — regla de negocio
    'INVALID_CURRENT_PASSWORD',
    'BUSINESS_RULE_VIOLATION',
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
 * `null` en el resto.
 */
export interface ErrorBody {
    error: {
        code: ErrorCode;
        message: string;
        details: Record<string, string> | null;
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
