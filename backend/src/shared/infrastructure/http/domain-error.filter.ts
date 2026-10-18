import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  ForbiddenActionError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "@shared/domain/domain-error";

/**
 * Seconds a rate-limited caller must wait, read off the one error that
 * carries it. Emitted as `Retry-After`, which is the standard signal
 * and the one a proxy or an HTTP client knows how to honour.
 */
function retryAfterSeconds(err: DomainError): number | null {
  const value = err.details?.retryAfterSeconds;
  return typeof value === "number" && value > 0 ? Math.ceil(value) : null;
}

/**
 * Uniform error envelope emitted by the API. Every HTTP error response
 * conforms to this shape; the frontend depends on `code` for behavior
 * and on `message` for user-facing copy.
 */
type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown> | null;
  };
};

/**
 * Global exception filter. The sole place where errors are translated
 * into HTTP responses. Handles three families:
 *
 * 1. {@link DomainError} — mapped to its HTTP status via the subtype
 *    and rendered with its own `code`, `message` and `details`.
 * 2. {@link HttpException} raised by Nest (typically by the
 *    `ValidationPipe`) — normalized to the same envelope so 400s stay
 *    consistent (C-04 in IMPLEMENTACION_AUTH.md).
 * 3. Anything else — logged with the request's correlation id and
 *    returned as an opaque 500 with `INTERNAL_SERVER_ERROR`, without
 *    leaking stack traces or internal messages.
 */
@Catch()
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const correlationId = req.correlationId ?? "none";

    if (exception instanceof DomainError) {
      const status = this.statusForDomainError(exception);

      const retryAfter = retryAfterSeconds(exception);
      if (retryAfter !== null) {
        res.setHeader("Retry-After", String(retryAfter));
      }

      res
        .status(status)
        .json(
          this.envelope(exception.code, exception.message, exception.details),
        );
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const { message, details } = this.extractHttpExceptionBody(exception);
      res
        .status(status)
        .json(this.envelope(this.codeForHttpStatus(status), message, details));
      return;
    }

    const err =
      exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(
      `Unhandled exception (correlationId=${correlationId}): ${err.message}`,
      err.stack,
    );
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        this.envelope(
          "INTERNAL_SERVER_ERROR",
          "Ocurrió un error interno inesperado.",
          null,
        ),
      );
  }

  private envelope(
    code: string,
    message: string,
    details: Record<string, unknown> | null,
  ): ErrorEnvelope {
    return { error: { code, message, details } };
  }

  private statusForDomainError(err: DomainError): number {
    if (err instanceof ValidationError) return HttpStatus.BAD_REQUEST;
    if (err instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED;
    if (err instanceof ForbiddenActionError) return HttpStatus.FORBIDDEN;
    if (err instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (err instanceof ConflictError) return HttpStatus.CONFLICT;
    if (err instanceof BusinessRuleError)
      return HttpStatus.UNPROCESSABLE_ENTITY;
    if (err instanceof TooManyRequestsError)
      return HttpStatus.TOO_MANY_REQUESTS;

    this.logger.warn(`Unmapped DomainError subtype: ${err.constructor.name}`);
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private codeForHttpStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "VALIDATION_ERROR";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHENTICATED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        // Only Nest's "no route matched" reaches here: resource-level
        // 404s are DomainErrors with their own code.
        return "RESOURCE_NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return "BUSINESS_RULE_VIOLATION";
      case HttpStatus.TOO_MANY_REQUESTS:
        // Where `ThrottlerGuard`'s exception lands: it is a plain
        // `HttpException`, so without this case the per-IP throttle
        // would answer `HTTP_ERROR` — a code the contract does not
        // define and the frontend cannot branch on.
        return "TOO_MANY_REQUESTS";
      default:
        return "HTTP_ERROR";
    }
  }

  private extractHttpExceptionBody(exception: HttpException): {
    message: string;
    details: Record<string, unknown> | null;
  } {
    const body = exception.getResponse();
    // Nest's own texts are in English ("Cannot GET /x"); the contract
    // requires user-facing Spanish copy (§5.2), so the message is fixed
    // per status.
    const message = this.messageForHttpStatus(exception.getStatus());
    let details: Record<string, unknown> | null = null;

    if (typeof body === "object" && body !== null) {
      // El `ValidationPipe` ya entrega `details` indexado por campo
      // (ver `toFieldKeyedBadRequest` en app.setup.ts), que es la
      // fuente correcta: el nombre lo trae `error.property`, no hay
      // nada que deducir.
      const supplied = (body as { details?: unknown }).details;
      if (isPlainRecord(supplied)) {
        details = supplied;
      } else if (Array.isArray((body as { message?: unknown }).message)) {
        // Camino de respaldo para cualquier `BadRequestException` que
        // no venga de ese pipe y traiga la lista plana de siempre.
        details = keyByField((body as { message: unknown[] }).message);
      }
    }

    return { message, details };
  }

  private messageForHttpStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "Los datos enviados no son válidos.";
      case HttpStatus.UNAUTHORIZED:
        return "La autenticación es requerida.";
      case HttpStatus.FORBIDDEN:
        return "No tiene permisos para realizar esta operación.";
      case HttpStatus.NOT_FOUND:
        return "El recurso solicitado no existe.";
      case HttpStatus.CONFLICT:
        return "La operación entra en conflicto con el estado actual del recurso.";
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return "No se puede realizar la operación debido a una regla de negocio.";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "Demasiadas peticiones. Esperá un momento antes de reintentar.";
      default:
        return "No se pudo procesar la solicitud.";
    }
  }
}

/**
 * Turns the `ValidationPipe`'s flat list of messages into a map keyed
 * by the field each one is about.
 *
 * The contract asks the response to *"marcar el campo en conflicto"*
 * (CA-4.3, CA-6.6), and the previous shape — `error_0`, `error_1`, … —
 * did not: the frontend had to parse the English message to work out
 * which input to highlight. That was survivable while every field was
 * flat, because the message opens with the property name, and stops
 * being survivable with nested objects like `lawyer.registrationNumber`.
 *
 * `class-validator` puts the property path at the start of each
 * message, so the first token is the key. Anything that does not look
 * like a path (a class-level constraint, for instance) is filed under
 * `_` rather than dropped — losing an error is worse than filing it
 * imprecisely.
 *
 * Several messages about the same field are joined, so a password
 * failing both length and digit rules reports both.
 */
function keyByField(messages: readonly unknown[]): Record<string, unknown> {
  const byField = new Map<string, string[]>();

  for (const raw of messages) {
    const text = String(raw);
    const [first] = text.split(" ");
    const field = /^[A-Za-z_$][\w$]*(\.[\w$]+|\[\d+\])*$/.test(first ?? "")
      ? first
      : "_";

    const previous = byField.get(field) ?? [];
    previous.push(text);
    byField.set(field, previous);
  }

  return Object.fromEntries(
    [...byField].map(([field, texts]) => [field, texts.join(" ")]),
  );
}

/** `true` for a plain object usable as the `details` map. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
