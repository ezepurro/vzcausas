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
    private _fullName: string,
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
    fullName: string;
    registrationNumber: RegistrationNumber;
    active: boolean;
  }): Lawyer {
    return new Lawyer(
      props.id,
      props.fullName,
      props.registrationNumber,
      props.active,
    );
  }

  /**
   * Creates a fresh {@link Lawyer} (HU12).
   *
   * @throws {ValidationError} if the id is not a positive integer or
   *   the full name is empty.
   */
  static create(props: {
    id: number;
    fullName: string;
    registrationNumber: RegistrationNumber;
    active?: boolean;
  }): Lawyer {
    if (!Number.isInteger(props.id) || props.id <= 0) {
      throw new ValidationError(
        "INVALID_LAWYER",
        "Lawyer id must be a positive integer.",
      );
    }

    if (!props.fullName || props.fullName.trim().length === 0) {
      throw new ValidationError(
        "INVALID_LAWYER",
        "Lawyer must have a non-empty full name.",
      );
    }

    return new Lawyer(
      props.id,
      props.fullName.trim(),
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

  get fullName(): string {
    return this._fullName;
  }

  get registrationNumber(): RegistrationNumber {
    return this._registrationNumber;
  }

  isActive(): boolean {
    return this._active;
  }
}
