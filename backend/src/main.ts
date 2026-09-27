import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
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
  const app = await NestFactory.create(AppModule);

  // Safe to read eagerly: validation already ran during module
  // initialization, so every variable below is guaranteed present.
  const config = app.get(ConfigService);

  configureApp(app);

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
    // Lets the frontend read the correlation id off any response and
    // quote it in a bug report.
    exposedHeaders: ["X-Correlation-Id"],
  });

  // Lets lifecycle hooks run on termination signals, so in-flight
  // requests finish before the process exits.
  app.enableShutdownHooks();

  await app.listen(Number(config.getOrThrow<string>("PORT")));
}

bootstrap();
