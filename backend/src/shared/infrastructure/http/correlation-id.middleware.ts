import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { IncomingMessage, ServerResponse } from "node:http";
import { NextFunction, Request, Response } from "express";
import { RequestContext } from "./request-context";

/**
 * Augment Express's `Request` with the correlation id set by
 * {@link CorrelationMiddleware}. Declared as an ambient module
 * augmentation so it is visible project-wide without extra imports.
 */
declare module "express-serve-static-core" {
  interface Request {
    correlationId?: string;
  }
}

/** Longest caller-supplied id that is honored (`audit_log.correlation_id`). */
const MAX_CORRELATION_ID_LENGTH = 128;

/**
 * The request's correlation id, assigning one the first time it is asked.
 *
 * Idempotent on purpose: both {@link CorrelationMiddleware} and the
 * request logger's `genReqId` (`logging.module.ts`) call it, and Nest
 * does not guarantee which of the two middlewares runs first. Whichever
 * does fixes the id; the other reads it back, so the `reqId` of every
 * log line always matches the `X-Correlation-Id` the client sees.
 *
 * If the caller already provided one (e.g. an upstream gateway), it is
 * honored; otherwise a fresh UUID v4 is generated.
 */
export function resolveCorrelationId(
  req: IncomingMessage & { correlationId?: string },
  res: ServerResponse,
): string {
  if (req.correlationId !== undefined) {
    return req.correlationId;
  }

  const header = req.headers["x-correlation-id"];
  const incoming = typeof header === "string" ? header : undefined;
  const id =
    incoming && incoming.length <= MAX_CORRELATION_ID_LENGTH
      ? incoming
      : randomUUID();

  req.correlationId = id;
  res.setHeader("X-Correlation-Id", id);
  return id;
}

/**
 * Assigns a correlation id to every incoming HTTP request and echoes
 * it back in the `X-Correlation-Id` response header.
 *
 * The correlation id lets logs, error responses and audit entries be
 * tied to a single request, which is what enables a "cannot log in"
 * user report to be traced end-to-end without leaking sensitive data.
 *
 * The rest of the request runs inside {@link RequestContext}, so the
 * audit adapter finds the id there without any use case passing it
 * (`AUDITORIA_Y_TRAZABILIDAD.md` §3).
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    RequestContext.run(resolveCorrelationId(req, res), () => next());
  }
}
