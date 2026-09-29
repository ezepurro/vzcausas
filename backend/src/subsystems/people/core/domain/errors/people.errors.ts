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
