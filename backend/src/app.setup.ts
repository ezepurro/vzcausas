import { INestApplication, ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";

/**
 * Configuración HTTP de la aplicación, compartida por `main.ts` y por la
 * app de los tests de integración (`test/shared/harness/test-app.ts`).
 *
 * Todo lo que cambie cómo se procesa una petición (prefijo, pipes,
 * cookies…) va acá, así los tests ejercitan exactamente lo mismo que
 * producción. Lo que es propio del proceso (CORS, puerto) queda en main.ts.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix("api/v1");

  // Puebla las cookies parseadas en el request, que es cómo el
  // controller de auth lee el refresh token. Va acá y no solo en
  // main.ts para que los tests de integración ejerciten exactamente
  // el mismo pipeline que producción.
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}
