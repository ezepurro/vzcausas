import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

declare module "express-serve-static-core" {
  interface Request {
    correlationId?: string;
  }
}

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
