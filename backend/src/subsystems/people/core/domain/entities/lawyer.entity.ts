import { ValidationError } from "@shared/domain/domain-error";
import { RegistrationNumber } from "../value-objects/registration-number.vo";

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
    private readonly _registrationNumber: RegistrationNumber,
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
    registrationNumber: RegistrationNumber;
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
   * @throws {ValidationError} if the id is not a positive integer or
   *   the last name or first names are empty.
   */
  static create(props: {
    id: number;
    lastName: string;
    firstName: string;
    registrationNumber: RegistrationNumber;
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
      props.registrationNumber,
      props.active ?? true,
    );
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

  get registrationNumber(): RegistrationNumber {
    return this._registrationNumber;
  }

  isActive(): boolean {
    return this._active;
  }
}
