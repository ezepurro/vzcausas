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
    'VALIDATION_ERROR',
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'INVALID_PAGINATION',
    'INVALID_PATH_PARAMETER',
    'INVALID_REQUEST',
    'USER_NOT_FOUND',
    'USERNAME_ALREADY_EXISTS',
    'USER_HAS_DEPENDENCIES',
    'BUSINESS_RULE_VIOLATION',
    'INVALID_CURRENT_PASSWORD',
    'LAWYER_REGISTRATION_ALREADY_EXISTS',
    'RESOURCE_NOT_FOUND',
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
 * DIVERGENCIA del contrato: es el único error que no usa el envoltorio
 * `{ error: { code, message, details } }`. No trae código, así que
 * `ApiError.code` queda en `null` para este caso.
 */
export interface LoginErrorBody {
    statusCode: 401;
    error: 'Unauthorized';
    message: string;
}
