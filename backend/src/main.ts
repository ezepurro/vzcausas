import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";

/**
 * Process-level configuration and startup.
 *
 * Only concerns that cannot be expressed as providers belong here — the
 * global exception filter, for instance, is registered through the
 * container by the shared kernel so it can receive injected
 * dependencies. Request-pipeline concerns (prefix, validation pipe,
 * cookies) live in `configureApp`, shared with the integration test
 * harness so both exercise the same pipeline.
 */
async function bootstrap(): Promise<void> {
  // `bufferLogs`: what is logged while the modules boot is held until
  // `configureApp` swaps in the JSON logger, instead of going out in
  // Nest's plain-text format.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Safe to read eagerly: validation already ran during module
  // initialization, so every variable below is guaranteed present.
  const config = app.get(ConfigService);

  configureApp(app);

  // Governs what `req.ip` returns, which both the per-IP throttle
  // (`AppThrottlerGuard`) and the login lockout's username+IP tier
  // (`LoginThrottle`) rely on. Off by default: trusting
  // `X-Forwarded-For` without a proxy actually in front lets any
  // caller spoof it and pick a fresh bucket on every request, which
  // would make the per-IP limit worthless. `TRUST_PROXY=1` behind
  // the Vite dev proxy or a real reverse proxy; left unset (or `0`)
  // when the app is reached directly.
  const trustProxy = config.get<string>("TRUST_PROXY");
  if (trustProxy !== undefined && trustProxy !== "0" && trustProxy !== "") {
    app.set("trust proxy", trustProxy === "1" ? true : trustProxy);
  }

  const origins = config
    .getOrThrow<string>("CORS_ALLOWED_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    // Required for the refresh cookie to be sent and accepted at all:
    // without it the browser discards the cookie on a cross-origin
    // response, and the frontend must pair it with credentialed
    // requests on its side.
    credentials: true,
    // X-Correlation-Id: lets the frontend quote it in a bug report.
    // Retry-After: lets a 429 (login lockout, or the per-IP throttle)
    // tell the client how long to wait without having to parse it out
    // of `details` first.
    exposedHeaders: ["X-Correlation-Id", "Retry-After"],
  });

  // Lets lifecycle hooks run on termination signals, so in-flight
  // requests finish before the process exits.
  app.enableShutdownHooks();

  await app.listen(Number(config.getOrThrow<string>("PORT")));
}

bootstrap();
