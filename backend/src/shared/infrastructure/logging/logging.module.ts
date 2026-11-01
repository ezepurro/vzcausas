import { IncomingMessage, ServerResponse } from "node:http";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { AuthenticatedUser } from "@shared/domain/authenticated-user";
import { resolveCorrelationId } from "../http/correlation-id.middleware";
import {
  serializeRequest,
  serializeResponse,
} from "./request-log.serializers";

/**
 * Probes hit these every few seconds (Docker's healthcheck, the uptime
 * monitor): logging them would bury every real request.
 */
const HEALTH_PATH = "/api/v1/health";

/** The authenticated caller, once `JwtAuthGuard` has put it on the request. */
function userIdOf(req: IncomingMessage): number | undefined {
  return (req as IncomingMessage & { user?: AuthenticatedUser }).user?.userId;
}

/**
 * The technical log of the API (`ARQUITECTURA_BACKEND_V1.md` §7.9):
 * one JSON line per request on stdout, plus whatever the rest of the
 * code writes through Nest's `Logger`, which `configureApp` routes here.
 *
 * Kept apart from the use cases on purpose. What a use case must leave
 * on record is business audit, and that goes through `AuditTrailPort`
 * (`AUDITORIA_Y_TRAZABILIDAD.md` §3), not through this.
 *
 * stdout and not a file: Render's free tier has an ephemeral disk, and
 * the platform already collects the process's output.
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.getOrThrow<string>("NODE_ENV");
        // Optional, like COPY_TO_RESPONSIBLE_LAWYER. Silent under Jest so
        // the suites' output stays readable. Detected by its worker id and
        // not by NODE_ENV: inside the backend container NODE_ENV comes
        // from docker/.env as `development`, and Jest does not override it.
        const underJest = process.env.JEST_WORKER_ID !== undefined;
        const level =
          config.get<string>("LOG_LEVEL") || (underJest ? "silent" : "info");

        return {
          pinoHttp: {
            level,
            // Readable lines in development. Never under Jest: the
            // transport runs in a worker thread that outlives the suite.
            transport:
              nodeEnv === "production" || underJest
                ? undefined
                : { target: "pino-pretty", options: { singleLine: true } },
            // Same id as the `X-Correlation-Id` header and the audit entry.
            genReqId: (req: IncomingMessage, res: ServerResponse) =>
              resolveCorrelationId(req, res),
            serializers: { req: serializeRequest, res: serializeResponse },
            // Second line of defense: the serializers already drop headers.
            redact: [
              "req.headers.authorization",
              "req.headers.cookie",
              'res.headers["set-cookie"]',
              "*.password",
              "*.refreshToken",
            ],
            customLogLevel: (
              _req: IncomingMessage,
              res: ServerResponse,
              err?: Error,
            ) => {
              if (err || res.statusCode >= 500) return "error";
              if (res.statusCode >= 400) return "warn";
              return "info";
            },
            // Built when the response finishes, after the guard has run:
            // `customProps` is also evaluated on arrival, when there is
            // no user yet.
            customSuccessObject: (
              req: IncomingMessage,
              _res: ServerResponse,
              value: Record<string, unknown>,
            ) => ({ ...value, userId: userIdOf(req) }),
            customErrorObject: (
              req: IncomingMessage,
              _res: ServerResponse,
              _err: Error,
              value: Record<string, unknown>,
            ) => ({ ...value, userId: userIdOf(req) }),
            autoLogging: {
              ignore: (req: IncomingMessage) =>
                req.url?.startsWith(HEALTH_PATH) ?? false,
            },
          },
        };
      },
    }),
  ],
})
export class LoggingModule {}
