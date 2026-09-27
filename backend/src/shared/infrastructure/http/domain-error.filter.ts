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
  UnauthorizedError,
  ValidationError,
} from "@shared/domain/domain-error";

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

    if (typeof body === "object" && body !== null && "message" in body) {
      const raw = (body as { message: unknown }).message;
      if (Array.isArray(raw)) {
        details = raw.reduce<Record<string, unknown>>(
          (acc, m, i) => ({ ...acc, [`error_${i}`]: m }),
          {},
        );
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
      default:
        return "No se pudo procesar la solicitud.";
    }
  }
}
