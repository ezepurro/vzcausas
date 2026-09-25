import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Configuración HTTP de la aplicación, compartida por `main.ts` y por la
 * app de los tests de integración (`test/shared/harness/test-app.ts`).
 *
 * Todo lo que cambie cómo se procesa una petición (prefijo, pipes,
 * cookies…) va acá, así los tests ejercitan exactamente lo mismo que
 * producción. Lo que es propio del proceso (CORS, puerto) queda en main.ts.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}
