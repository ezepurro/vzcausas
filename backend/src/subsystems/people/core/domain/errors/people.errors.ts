import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@shared/domain/domain-error";

/**
 * Emitted by `RegisterLawyer` (HU12) when the bar registration
 * number is already on file. The matrícula identifies a lawyer
 * uniquely, so a duplicate is a conflict, not a validation problem.
 *
 * The error code matches the one the API contract documents for
 * `POST /lawyers` and for `POST /users` when it registers a lawyer
 * inline (§3.2, §3.3).
 */
export class LawyerRegistrationAlreadyExistsError extends ConflictError {
  constructor() {
    super(
      "LAWYER_REGISTRATION_ALREADY_EXISTS",
      "The lawyer's registration number is already registered.",
    );
  }
}

/**
 * Emitted by `GET /lawyers/{lawyerId}` when no lawyer matches —
 * including one that exists but was logically deleted (RN12,
 * `active: false`). Per §3.3, a deactivated lawyer *"no aparece en
 * ningún listado"* and cannot be consulted, so it must be
 * indistinguishable from one that never existed.
 *
 * `identity` has its own `LawyerNotFoundError` for a different
 * situation (a user referencing a lawyer that cannot be resolved,
 * 422). Same name, different subsystem and different status on
 * purpose: this one answers "the resource you asked for is not
 * here", which is a 404.
 */
export class LawyerNotFoundError extends NotFoundError {
  constructor(lawyerId: number) {
    super("LAWYER_NOT_FOUND", "No se encontró el abogado solicitado.", {
      lawyerId,
    });
  }
}

/**
 * Emitted when the `lawyerId` path parameter is not a positive
 * integer. Mirrors `identity`'s `InvalidUserIdError` so both
 * resources reject a malformed id with the contract's
 * `INVALID_PATH_PARAMETER` code rather than a generic 400.
 */
export class InvalidLawyerIdError extends ValidationError {
  constructor() {
    super(
      "INVALID_PATH_PARAMETER",
      "El identificador del abogado no es válido.",
      { lawyerId: "Debe ser un número entero válido." },
    );
  }
}

/**
 * Emitted by `Lawyer.update` (HU14) when the `PATCH` brings no field to
 * change: the contract asks for at least one (CA-14.10). Same `details` as
 * `identity`'s `EmptyUpdateRequestError`, so both `PATCH`es answer alike.
 */
export class EmptyLawyerUpdateError extends ValidationError {
  constructor() {
    super("VALIDATION_ERROR", "Los datos enviados no son válidos.", {
      body: "Debe enviarse al menos un campo para modificar.",
    });
  }
}

/**
 * Emitted by `RegisterClient` (HU-8) when the document already belongs to
 * a **current** client (CA-8.4), whether it is a DNI or a passport (D-108).
 *
 * The name and the `code` keep saying DNI on purpose: the contract keeps
 * `CLIENT_DNI_ALREADY_EXISTS` so that V4 clients keep handling the error.
 *
 * Scoped to current clients on purpose: the database's unique index
 * is partial (`clients_document_active_key ... WHERE active`), so a client
 * who was logically deleted frees their document. The same person can
 * be registered again once HU-11 exists, which a plain unique index
 * would make impossible.
 *
 * `details.field` lets the frontend mark the document input rather
 * than showing a form-level message.
 */
export class ClientDniAlreadyExistsError extends ConflictError {
  constructor() {
    super(
      "CLIENT_DNI_ALREADY_EXISTS",
      "Ya existe un cliente registrado con ese DNI.",
      { field: "documentNumber" },
    );
  }
}

/**
 * Emitted by `GET /clients/{clientId}` when no current client matches.
 *
 * A logically deleted client gets this too, not a payload with
 * `active: false`: through this endpoint a client that was given up
 * must be indistinguishable from one that never existed, the same
 * rule {@link LawyerNotFoundError} applies.
 */
export class ClientNotFoundError extends NotFoundError {
  constructor() {
    // Sin `details`: el contrato (§3.6) muestra `null` para este error.
    // Devolver el id pedido no agrega nada —el cliente ya lo sabe, lo
    // acaba de enviar— y lo repite en el cuerpo de la respuesta, que es
    // justo lo que CT-6 evita para un dato personal.
    super("CLIENT_NOT_FOUND", "No se encontró el cliente solicitado.");
  }
}

/**
 * Emitted when the `clientId` path parameter is not a positive
 * integer. Mirrors {@link InvalidLawyerIdError} so both resources
 * reject a malformed id with the contract's `INVALID_PATH_PARAMETER`
 * rather than a generic 400.
 */
export class InvalidClientIdError extends ValidationError {
  constructor() {
    super(
      "INVALID_PATH_PARAMETER",
      "El identificador del cliente no es válido.",
      { clientId: "Debe ser un número entero válido." },
    );
  }
}
