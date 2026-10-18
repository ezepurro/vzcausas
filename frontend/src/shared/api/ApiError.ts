import type { ErrorCode } from './contract';

/**
 * Error normalizado de la API. Todo lo que sale de http.ts es una
 * instancia de esto, así ninguna página tiene que conocer axios.
 *
 * Los tres campos salen del cuerpo que define el contrato (§4.2):
 * `{ error: { code, message, details } }`.
 */
export class ApiError extends Error {
    readonly status: number;

    /**
     * Código del contrato: `USERNAME_ALREADY_EXISTS`, `USER_NOT_FOUND`, etc.
     *
     * Es lo que permite distinguir dos errores con el mismo código HTTP —un
     * `409` por nombre repetido de un `409` por dependencias— sin mirar el
     * texto del mensaje. Para compararlo, usar `is()`.
     *
     * Queda en `null` cuando la respuesta no trae código: error de red, o el
     * `401` de `/auth/login`, que usa otra forma.
     *
     * Se tipa como `string` y no como `ErrorCode` a propósito: si el backend
     * agrega un código que el front todavía no conoce, se conserva igual.
     */
    readonly code: string | null;

    /**
     * Errores por campo de los `400 VALIDATION_ERROR`, tal cual los manda el
     * contrato: `{ username: 'El nombre de usuario es obligatorio.' }`.
     *
     * `null` cuando el error no es de validación. Para leer un campo suelto
     * conviene `fieldError()`.
     */
    readonly details: Record<string, string> | null;

    /**
     * Segundos a esperar antes de reintentar, en los `429` (bloqueo de login
     * o límite de pedidos por IP). Viene del encabezado `Retry-After`, no de
     * `details`: el backend manda `retryAfterSeconds` como número dentro de
     * `details` (V3 §5.2), pero `details` acá es `Record<string, string>` a
     * propósito —son mensajes de campo para formularios— así que meter un
     * número ahí habría obligado a todo el código que ya lo da por string a
     * defenderse de un caso que no le corresponde. `null` en cualquier otra
     * respuesta, o si el encabezado no vino.
     */
    readonly retryAfterSeconds: number | null;

    constructor(
        status: number,
        message: string,
        code: string | null = null,
        details: Record<string, string> | null = null,
        retryAfterSeconds: number | null = null,
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    /**
     * Compara contra un código del contrato.
     *
     * ```ts
     * if (e.is('USERNAME_ALREADY_EXISTS')) marcarCampo('username')
     * ```
     *
     * El parámetro está tipado como `ErrorCode` para que haya autocompletado
     * y para que un código mal escrito no compile.
     */
    is(code: ErrorCode): boolean {
        return this.code === code;
    }

    /** Mensaje de error de un campo, para pintarlo en el formulario. */
    fieldError(field: string): string | undefined {
        return this.details?.[field];
    }

    /** `true` si hay algún error por campo que mostrar. */
    get hasFieldErrors(): boolean {
        return this.details !== null && Object.keys(this.details).length > 0;
    }

    /**
     * Los errores por campo como lista `"campo: mensaje"`.
     * Para un resumen arriba del formulario, o para un log.
     */
    get detailList(): string[] {
        if (!this.details) return [];
        return Object.entries(this.details).map(([field, message]) => `${field}: ${message}`);
    }

    /** Choque con la unicidad de un recurso (§5). */
    get isConflict(): boolean {
        return this.status === 409;
    }

    get isNotFound(): boolean {
        return this.status === 404;
    }

    /**
     * Código HTTP. Usamos 0 para "el request nunca llegó a destino"
     * (backend caído, sin red, timeout). No es un código real: es nuestra
     * convención para el caso "no hubo respuesta".
     */
    get isNetworkError(): boolean {
        return this.status === 0;
    }

    /**
     * Datos inválidos: el request está mal formado o le faltan campos.
     * Suele haber algo útil en `details`.
     *
     * Ojo: **sólo 400**. El contrato separa "datos inválidos" (400) de
     * "violación de una regla de negocio" (422), que es `isBusinessRule`.
     */
    get isValidation(): boolean {
        return this.status === 400;
    }

    /**
     * Regla de negocio (§5, `422`): los datos son válidos pero la operación
     * no se puede hacer. Ej: eliminar el último administrador, o cambiar la
     * contraseña mandando mal la actual.
     */
    get isBusinessRule(): boolean {
        return this.status === 422;
    }

    get isAuth(): boolean {
        return this.status === 401 || this.status === 403;
    }

    /** Reventó el backend */
    get isServer(): boolean {
        return this.status >= 500;
    }
}

/**
 * Type guard para los catch.
 *
 * `catch (e)` te da `e: unknown` porque en JS se puede tirar cualquier cosa.
 * Esta función le demuestra al compilador que es un ApiError
 */
export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}
