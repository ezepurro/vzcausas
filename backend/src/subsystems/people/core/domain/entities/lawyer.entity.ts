import { ValidationError } from "@shared/domain/domain-error";
import { EmptyLawyerUpdateError } from "../errors/people.errors";
import { LawyerChangeSet, LawyerField } from "../value-objects/lawyer-change-set.vo";
import { PersonName } from "../value-objects/person-name.vo";
import { RegistrationNumber } from "../value-objects/registration-number.vo";

const INVALID_DATA_MESSAGE = "Los datos enviados no son válidos.";

/**
 * What the "Modificar abogado" form sends (HU14). A field left out
 * (`undefined`) is not touched; a name sent empty, blank or `null` is an
 * attempt to empty it, which the rules reject (CA-14.4). The registration
 * number is the exception: sent that way it is cleared (D-107).
 */
export type LawyerChanges = {
  lastName?: string | null;
  firstName?: string | null;
  registrationNumber?: string | null;
};

/**
 * Aggregate root of the `people` subsystem: the professional record
 * of a lawyer practising at the firm.
 *
 * A `Lawyer` is **not** a system account — that is `identity`'s
 * `User`. A lawyer can exist without ever logging in, which is why
 * the link lives on the `User` side (`lawyerId`) and is optional.
 *
 * `activeCases` (API contract §3.3) is deliberately absent: it is
 * derived from the `cases` subsystem, which does not exist yet, and
 * a computed read-only figure is not part of this aggregate's state.
 * The HTTP mapper reports it as `0` until `cases` lands.
 */
export class Lawyer {
  private constructor(
    private readonly _id: number,
    private _lastName: string,
    private _firstName: string,
    private _registrationNumber: RegistrationNumber | null,
    private _active: boolean,
  ) {}

  /**
   * Rebuilds a {@link Lawyer} from persisted data, trusting the
   * database and skipping creation-time validation — same contract as
   * `User.hydrate` in `identity`.
   */
  static hydrate(props: {
    id: number;
    lastName: string;
    firstName: string;
    registrationNumber: RegistrationNumber | null;
    active: boolean;
  }): Lawyer {
    return new Lawyer(
      props.id,
      props.lastName,
      props.firstName,
      props.registrationNumber,
      props.active,
    );
  }

  /**
   * Creates a fresh {@link Lawyer} (HU12).
   *
   * Last name and first names are separate since API Contract V4
   * (D-68), without the "Dr."/"Dra." title, which the frontend adds
   * (D-81).
   *
   * The registration number is optional (D-107): a lawyer who has not been
   * registered at the bar yet is created without one.
   *
   * @throws {ValidationError} if the id is not a positive integer or
   *   the last name or first names are empty.
   */
  static create(props: {
    id: number;
    lastName: string;
    firstName: string;
    registrationNumber?: RegistrationNumber | null;
    active?: boolean;
  }): Lawyer {
    if (!Number.isInteger(props.id) || props.id <= 0) {
      throw new ValidationError(
        "INVALID_LAWYER",
        "Lawyer id must be a positive integer.",
      );
    }

    const lastName = props.lastName?.trim() ?? "";
    if (lastName.length === 0) {
      throw new ValidationError(
        "INVALID_LAWYER",
        "Lawyer must have a non-empty last name.",
        { field: "lastName" },
      );
    }

    const firstName = props.firstName?.trim() ?? "";
    if (firstName.length === 0) {
      throw new ValidationError(
        "INVALID_LAWYER",
        "Lawyer must have non-empty first names.",
        { field: "firstName" },
      );
    }

    return new Lawyer(
      props.id,
      lastName,
      firstName,
      props.registrationNumber ?? null,
      props.active ?? true,
    );
  }

  /**
   * HU14 — changes the last name, the first names or the registration
   * number. Only the fields sent are touched. A registration number sent
   * empty, blank or `null` is cleared (D-107).
   *
   * Every field sent is validated **before** anything is applied, and every
   * problem is reported at once, one message per field: either the whole
   * change is valid and lands, or the lawyer stays as it was (CA-14.4, CA-14.8,
   * CA-14.9). Whether the new registration number belongs to another lawyer
   * needs the other lawyers, so the use case checks it (CA-14.3).
   *
   * @returns what actually changed: a field sent with the value it already
   *   had is not a change (CA-14.7).
   * @throws {EmptyLawyerUpdateError} if no field was sent (CA-14.10).
   * @throws {ValidationError} `VALIDATION_ERROR` with the invalid fields.
   */
  update(changes: LawyerChanges): LawyerChangeSet {
    const sent = (["lastName", "firstName", "registrationNumber"] as const).filter(
      (field) => changes[field] !== undefined,
    );
    if (sent.length === 0) {
      throw new EmptyLawyerUpdateError();
    }

    const errors: Record<string, unknown> = {};
    const lastName = Lawyer.validated(errors, changes.lastName, (raw) => PersonName.create("lastName", raw));
    const firstName = Lawyer.validated(errors, changes.firstName, (raw) => PersonName.create("firstName", raw));
    const registrationNumber = Lawyer.validated(errors, changes.registrationNumber, (raw) =>
      Lawyer.registrationNumberFrom(raw),
    );
    if (Object.keys(errors).length > 0) {
      throw new ValidationError("VALIDATION_ERROR", INVALID_DATA_MESSAGE, errors);
    }

    const changed: LawyerField[] = [];
    if (lastName && lastName.toString() !== this._lastName) {
      this._lastName = lastName.toString();
      changed.push("lastName");
    }
    if (firstName && firstName.toString() !== this._firstName) {
      this._firstName = firstName.toString();
      changed.push("firstName");
    }
    // `registrationNumber` is `null` both for "not sent" and for "clear it", so
    // what was sent decides (D-107).
    if (changes.registrationNumber !== undefined) {
      const same =
        registrationNumber === null
          ? this._registrationNumber === null
          : this._registrationNumber?.equals(registrationNumber) === true;
      if (!same) {
        this._registrationNumber = registrationNumber;
        changed.push("registrationNumber");
      }
    }
    return LawyerChangeSet.of(changed);
  }

  /**
   * Runs one field's validation if the field was sent, and keeps its
   * `details` instead of letting it throw, so the others are validated too.
   * `null` when the field was not sent or was invalid.
   */
  private static validated<T>(
    errors: Record<string, unknown>,
    raw: string | null | undefined,
    build: (raw: string | null) => T,
  ): T | null {
    if (raw === undefined) {
      return null;
    }
    try {
      return build(raw);
    } catch (error) {
      if (error instanceof ValidationError && error.details) {
        Object.assign(errors, error.details);
        return null;
      }
      throw error;
    }
  }

  /**
   * The registration number with the message of the form for a bad format
   * (CA-14.8). Empty, blank and `null` mean "no registration number" and give
   * `null` (D-107). `RegistrationNumber` itself keeps its own error, which the
   * registration (HU12) relies on.
   */
  private static registrationNumberFrom(raw: string | null): RegistrationNumber | null {
    const field = (message: string) =>
      new ValidationError("VALIDATION_ERROR", INVALID_DATA_MESSAGE, { registrationNumber: message });
    if (raw === null || raw.trim() === "") {
      return null;
    }
    try {
      return RegistrationNumber.create(raw);
    } catch {
      throw field("El formato de la matrícula no es válido.");
    }
  }

  /** Logical deletion (RN12), mirroring `User.deactivate()`. */
  deactivate(): void {
    this._active = false;
  }

  get id(): number {
    return this._id;
  }

  get lastName(): string {
    return this._lastName;
  }

  get firstName(): string {
    return this._firstName;
  }

  /** `null` if the lawyer has no registration number loaded (D-107). */
  get registrationNumber(): RegistrationNumber | null {
    return this._registrationNumber;
  }

  isActive(): boolean {
    return this._active;
  }
}
