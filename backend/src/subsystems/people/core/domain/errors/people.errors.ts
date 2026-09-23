import { ConflictError } from "@shared/domain/domain-error";

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
