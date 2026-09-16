
/**
 * Error normalizado de la API. Todo lo que sale de http.ts es una
 * instancia de esto, así ninguna página tiene que conocer axios.
 */
export class ApiError extends Error {
    readonly status: number;
    readonly details: string[];


    constructor(status: number, message: string, details: string[] = []) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }

    /** Choque con una regla de negocio. Ej: el CUIT ya está registrado. */
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

      /** Datos inválidos. Suele haber algo útil en `details`. */
    get isValidation(): boolean {
        return this.status === 422 || this.status === 400;
    }

    get isAuth(): boolean {
        return this.status === 401 || this.status === 403;
    }
    /** Reventó el backend */
    get isServer():boolean {
        return this.status >= 500
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
