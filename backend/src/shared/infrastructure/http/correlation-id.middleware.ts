import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

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

/**
 * Assigns a correlation id to every incoming HTTP request and echoes
 * it back in the `X-Correlation-Id` response header. If the caller
 * already provided one (e.g. an upstream gateway), it is honored;
 * otherwise a fresh UUID v4 is generated.
 *
 * The correlation id lets logs, error responses and audit entries be
 * tied to a single request, which is what enables a "cannot log in"
 * user report to be traced end-to-end without leaking sensitive data.
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header("X-Correlation-Id");
    const id = incoming && incoming.length <= 128 ? incoming : randomUUID();

    req.correlationId = id;
    res.setHeader("X-Correlation-Id", id);
    next();
  }
}
