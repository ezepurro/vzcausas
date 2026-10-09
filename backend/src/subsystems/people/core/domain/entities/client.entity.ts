import { ValidationError } from "@shared/domain/domain-error";
import { Dni } from "../value-objects/dni.vo";

/**
 * A client of the firm: the person a case is run for.
 *
 * Surname and given names are kept in **separate fields** (CA-8.2).
 * The familiar `GÓMEZ, Ariel Fernando` is a presentation format the
 * interface composes; storing it composed would make it impossible to
 * sort or search by surname, which `GET /clients` needs.
 *
 * A client is **not** a system user and never logs in: `identity`'s
 * `User` has no link to this entity. Nor does a client know about
 * cases — RN1 fixes the case as the unit of work, and the foreign key
 * lives on `cases.client_id`, in the other direction.
 *
 * `clientSince` is a civil date supplied by the caller rather than
 * computed here: the entity has no business reading a clock, so the
 * use case injects it through `ClockPort.today()` (CA-8.7).
 */
export class Client {
  private constructor(
    private readonly _id: number,
    private _lastName: string,
    private _firstName: string,
    private readonly _dni: Dni,
    private _phone: string | null,
    private _email: string | null,
    private readonly _clientSince: Date,
    private _active: boolean,
  ) {}

  /**
   * Rebuilds a {@link Client} from persisted data, trusting the
   * database and skipping creation-time validation — same contract as
   * `Lawyer.hydrate`.
   */
  static hydrate(props: {
    id: number;
    lastName: string;
    firstName: string;
    dni: Dni;
    phone: string | null;
    email: string | null;
    clientSince: Date;
    active: boolean;
  }): Client {
    return new Client(
      props.id,
      props.lastName,
      props.firstName,
      props.dni,
      props.phone,
      props.email,
      props.clientSince,
      props.active,
    );
  }

  /**
   * Creates a fresh {@link Client} (HU-8).
   *
   * Phone and email are optional (CA-8.5): absent and blank both
   * become `null`, so the column never holds an empty string that
   * reads as "has a phone" to anything checking for presence.
   *
   * @throws {ValidationError} if the id is not a positive integer or
   *   surname or given names are empty.
   */
  static create(props: {
    id: number;
    lastName: string;
    firstName: string;
    dni: Dni;
    phone?: string | null;
    email?: string | null;
    clientSince: Date;
    active?: boolean;
  }): Client {
    if (!Number.isInteger(props.id) || props.id <= 0) {
      throw new ValidationError(
        "INVALID_CLIENT",
        "El identificador del cliente debe ser un entero positivo.",
      );
    }

    const lastName = props.lastName?.trim() ?? "";
    if (lastName.length === 0) {
      throw new ValidationError(
        "INVALID_CLIENT",
        "El apellido es obligatorio.",
        { field: "lastName" },
      );
    }

    const firstName = props.firstName?.trim() ?? "";
    if (firstName.length === 0) {
      throw new ValidationError(
        "INVALID_CLIENT",
        "Los nombres son obligatorios.",
        { field: "firstName" },
      );
    }

    return new Client(
      props.id,
      lastName,
      firstName,
      props.dni,
      blankToNull(props.phone),
      blankToNull(props.email),
      props.clientSince,
      props.active ?? true,
    );
  }

  /** Logical deletion (RN12), mirroring `Lawyer.deactivate()`. */
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

  get dni(): Dni {
    return this._dni;
  }

  get phone(): string | null {
    return this._phone;
  }

  get email(): string | null {
    return this._email;
  }

  get clientSince(): Date {
    return this._clientSince;
  }

  isActive(): boolean {
    return this._active;
  }
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}
