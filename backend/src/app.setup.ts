import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from "@nestjs/common";
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
      exceptionFactory: toFieldKeyedBadRequest,
    }),
  );

  return app;
}

/**
 * Convierte los errores de `class-validator` en un mapa **campo →
 * mensaje**, que es lo que el contrato pide para `details` y lo que el
 * frontend necesita para marcar el input que falla (CA-4.3, CA-6.6,
 * CA-8.6).
 *
 * Existe porque la forma por defecto del pipe es una lista plana de
 * frases. El filtro de errores deducía el campo tomando la primera
 * palabra del mensaje —lo cual funciona solo mientras los mensajes
 * empiecen con el nombre de la propiedad, como los de fábrica— y se
 * rompía con cualquier mensaje propio: un `@Matches` con mensaje en
 * castellano producía la clave `"Debe"`. Acá no se adivina nada: el
 * nombre del campo lo trae `error.property`.
 *
 * Las propiedades anidadas se reportan con su ruta completa
 * (`lawyer.registrationNumber`), que es lo que permite marcar un input
 * dentro de un subformulario.
 */
function toFieldKeyedBadRequest(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    message: "Los datos enviados no son válidos.",
    details: flatten(errors),
  });
}

function flatten(
  errors: readonly ValidationError[],
  prefix = "",
): Record<string, string> {
  const details: Record<string, string> = {};

  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;

    if (error.constraints !== undefined) {
      // Varios mensajes sobre un mismo campo se unen, así una
      // contraseña que falla por largo y por dígito reporta ambos.
      details[path] = Object.values(error.constraints).join(" ");
    }

    if (error.children !== undefined && error.children.length > 0) {
      Object.assign(details, flatten(error.children, path));
    }
  }

  return details;
}
