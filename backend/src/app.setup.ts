import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from "@nestjs/common";
import cookieParser from "cookie-parser";
import { InvalidPaginationError } from "@shared/infrastructure/http/pagination";

/**
 * Campos de {@link PaginationQueryDto}. Cuando **todo** lo que falla es uno
 * de estos, el contrato pide su propio código de error.
 */
const PAGINATION_FIELDS = new Set(["page", "limit"]);

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
function toFieldKeyedBadRequest(
  errors: ValidationError[],
): BadRequestException | InvalidPaginationError {
  const details = flatten(errors);
  const fields = Object.keys(details);

  /*
   * Paginación: el contrato le da su propio código, `INVALID_PAGINATION`, en
   * lugar del `VALIDATION_ERROR` genérico (§3.7 y el catálogo de §5.3). Se
   * decide acá porque es el único lugar que sabe **qué campos** fallaron: el
   * filtro global recibe ya la excepción y le fija el código por status
   * (`domain-error.filter.ts`, `codeForHttpStatus`).
   *
   * Devolver un `DomainError` en vez de un `BadRequestException` es
   * deliberado: el filtro atiende primero a los `DomainError` y usa su `code`,
   * su `message` y sus `details` propios, así que no hace falta tocarlo.
   *
   * Vale para los cuatro listados —`/users`, `/lawyers`, `/clients`,
   * `/cases`— porque los cuatro extienden `PaginationQueryDto`. Sólo aplica
   * si **todo** lo que falló es paginación: un `?page=0&search=<300 chars>`
   * sigue siendo un `VALIDATION_ERROR`, porque hay un campo del recurso
   * que el cliente tiene que corregir y no se puede perder en el camino.
   */
  if (fields.length > 0 && fields.every((field) => PAGINATION_FIELDS.has(field))) {
    return new InvalidPaginationError();
  }

  return new BadRequestException({
    message: "Los datos enviados no son válidos.",
    details,
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
