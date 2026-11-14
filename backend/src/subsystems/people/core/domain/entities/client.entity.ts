import { ValidationError } from "@shared/domain/domain-error";
import { EmptyClientUpdateError } from "../errors/people.errors";
import { CLIENT_FIELDS, ClientChangeSet, ClientField } from "../value-objects/client-change-set.vo";
import { Deactivation } from "@shared/domain/deactivation.vo";
import { ClientDocument } from "../value-objects/client-document.vo";
import { PersonName } from "../value-objects/person-name.vo";

const INVALID_DATA_MESSAGE = "Los datos enviados no son válidos.";

/** A required, bounded text of the client, with the registration's messages (D-109). */
interface RequiredTextRule {
  max: number;
  required: string;
  tooLong: string;
}

const ADDRESS_RULE: RequiredTextRule = {
  max: 255,
  required: "La dirección es obligatoria.",
  tooLong: "La dirección no puede superar los 255 caracteres.",
};

const PHONE_RULE: RequiredTextRule = {
  max: 50,
  required: "El teléfono es obligatorio.",
  tooLong: "El teléfono no puede superar los 50 caracteres.",
};

/**
 * What `PATCH /clients/{clientId}` sends (HU10). Every field is optional:
 * `undefined` means "not sent, keep it"; `null` on `email` clears it, and on
 * a required field it is an attempt to empty it, refused by {@link Client.update}.
 * `clientSince` is not here: it cannot be modified (CA-10.8).
 */
export interface ClientChanges {
  lastName?: string | null;
  firstName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

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
 *
 * The identity document is a type plus a number (D-108). Address and phone are
 * required (D-109), in the entity and in the database.
 */
export class Client {
  private constructor(
    private readonly _id: number,
    private _lastName: string,
    private _firstName: string,
    // Editable since V6 (D-121): HU10 can change it.
    private _document: ClientDocument,
    private _address: string,
    private _phone: string,
    private _email: string | null,
    private readonly _clientSince: Date,
    private _active: boolean,
    // Who gave the client de baja, when and why (HU11). `null` while in force.
    private _deactivation: Deactivation | null = null,
  ) {}

  /**
   * Rebuilds a {@link Client} from persisted data, trusting the
   * database and skipping creation-time validation — same contract as
   * `Lawyer.hydrate`. The one rule it keeps is the one the database keeps
   * too (`ck_clients_deactivation_coherent`): a client given de baja has its
   * record and one in force has none, so neither half can exist alone.
   */
  static hydrate(props: {
    id: number;
    lastName: string;
    firstName: string;
    document: ClientDocument;
    address: string;
    phone: string;
    email: string | null;
    clientSince: Date;
    active: boolean;
    deactivation: Deactivation | null;
  }): Client {
    if (props.active === (props.deactivation !== null)) {
      throw new Error(`Client ${props.id} is ${props.active ? "in force with" : "given de baja without"} a deactivation record.`);
    }
    return new Client(
      props.id,
      props.lastName,
      props.firstName,
      props.document,
      props.address,
      props.phone,
      props.email,
      props.clientSince,
      props.active,
      props.deactivation,
    );
  }

  /**
   * Creates a fresh {@link Client} (HU-8).
   *
   * Address and phone are required (D-109): a missing, empty or blank one is
   * rejected. The email stays optional (CA-8.5): absent and blank both become
   * `null`, so the column never holds an empty string that reads as "has an
   * email" to anything checking for presence.
   *
   * @throws {ValidationError} if the id is not a positive integer or
   *   surname, given names, address or phone are empty.
   */
  static create(props: {
    id: number;
    lastName: string;
    firstName: string;
    document: ClientDocument;
    address: string;
    phone: string;
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

    const address = props.address?.trim() ?? "";
    if (address.length === 0) {
      throw new ValidationError(
        "INVALID_CLIENT",
        "La dirección es obligatoria.",
        { field: "address" },
      );
    }

    const phone = props.phone?.trim() ?? "";
    if (phone.length === 0) {
      throw new ValidationError(
        "INVALID_CLIENT",
        "El teléfono es obligatorio.",
        { field: "phone" },
      );
    }

    return new Client(
      props.id,
      lastName,
      firstName,
      props.document,
      address,
      phone,
      Client.blankToNull(props.email),
      props.clientSince,
      props.active ?? true,
    );
  }

  /**
   * HU10 — corrects the client's data (contract V6, `PATCH /clients/{clientId}`).
   *
   * An omitted field does not change; `email: null` clears it. Last name,
   * first names, address and phone may not be emptied (D-109). The document is
   * editable (D-121) and its number is checked against the type that results:
   * sending only the type checks the number the client already had (CA-10.3).
   *
   * Everything is validated **before** anything is applied, and every problem
   * comes back in one `400` with the registration's messages: either the whole
   * change lands or the client stays as it was. Whether the new document
   * belongs to another client needs the others, so the use case checks it.
   *
   * @returns what actually changed.
   * @throws {EmptyClientUpdateError} no field was sent (CA-10.1).
   * @throws {ValidationError} `VALIDATION_ERROR` with every invalid field.
   */
  update(changes: ClientChanges): ClientChangeSet {
    if (!CLIENT_FIELDS.some((field) => changes[field] !== undefined)) {
      throw new EmptyClientUpdateError();
    }

    const errors: Record<string, string> = {};
    const lastName = Client.collect(errors, () =>
      changes.lastName === undefined ? undefined : PersonName.forClient("lastName", changes.lastName).toString(),
    );
    const firstName = Client.collect(errors, () =>
      changes.firstName === undefined ? undefined : PersonName.forClient("firstName", changes.firstName).toString(),
    );
    const document = Client.collect(errors, () => this.documentAfter(changes));
    const address = Client.requiredText(errors, "address", changes.address, ADDRESS_RULE);
    const phone = Client.requiredText(errors, "phone", changes.phone, PHONE_RULE);
    if (Object.keys(errors).length > 0) {
      throw new ValidationError("VALIDATION_ERROR", INVALID_DATA_MESSAGE, errors);
    }

    const changed: ClientField[] = [];
    if (lastName !== undefined && lastName !== this._lastName) {
      this._lastName = lastName;
      changed.push("lastName");
    }
    if (firstName !== undefined && firstName !== this._firstName) {
      this._firstName = firstName;
      changed.push("firstName");
    }
    if (document !== undefined && !document.equals(this._document)) {
      if (document.type !== this._document.type) changed.push("documentType");
      if (document.number !== this._document.number) changed.push("documentNumber");
      this._document = document;
    }
    if (address !== undefined && address !== this._address) {
      this._address = address;
      changed.push("address");
    }
    if (phone !== undefined && phone !== this._phone) {
      this._phone = phone;
      changed.push("phone");
    }
    if (changes.email !== undefined) {
      const email = Client.blankToNull(changes.email);
      if (email !== this._email) {
        this._email = email;
        changed.push("email");
      }
    }
    return ClientChangeSet.of(changed);
  }

  /**
   * The document the change leaves: what was sent over what the client has.
   * The number is checked against the resulting type (CA-10.3).
   */
  private documentAfter(changes: ClientChanges): ClientDocument | undefined {
    if (changes.documentType === undefined && changes.documentNumber === undefined) {
      return undefined;
    }
    try {
      return ClientDocument.create(
        changes.documentType ?? this._document.type,
        changes.documentNumber ?? this._document.number,
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        const field = (error.details as { field?: string } | null)?.field ?? "documentNumber";
        throw new ValidationError("VALIDATION_ERROR", INVALID_DATA_MESSAGE, { [field]: error.message });
      }
      throw error;
    }
  }

  /** Runs a check and keeps its `details` instead of stopping at the first failure. */
  private static collect<T>(errors: Record<string, string>, check: () => T): T | undefined {
    try {
      return check();
    } catch (error) {
      if (error instanceof ValidationError && error.details) {
        Object.assign(errors, error.details);
        return undefined;
      }
      throw error;
    }
  }

  /** A required, bounded text (D-109): omitted keeps it; empty, blank or `null` is refused. */
  private static requiredText(
    errors: Record<string, string>,
    field: "address" | "phone",
    raw: string | null | undefined,
    rule: RequiredTextRule,
  ): string | undefined {
    if (raw === undefined) {
      return undefined;
    }
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value === "") {
      errors[field] = rule.required;
      return undefined;
    }
    if (value.length > rule.max) {
      errors[field] = rule.tooLong;
      return undefined;
    }
    return value;
  }

  /**
   * HU11 — gives the client de baja (contract V6, `DELETE /clients/{clientId}`).
   * The baja is logical (RN12): the client is kept, with who, when and why,
   * and stops existing for the client of the API. Its cases keep referencing
   * it (CA-11.4).
   *
   * Whether it may — no active cases (CA-11.2, D-122) — needs the cases, which
   * are another subsystem's: the use case asks before getting here. A client
   * already given de baja answers 404 earlier too, so reaching it twice is a
   * programming error.
   */
  deactivate(deactivation: Deactivation): void {
    if (!this._active) {
      throw new Error(`The client ${this._id} was already given de baja.`);
    }
    this._active = false;
    this._deactivation = deactivation;
  }

  /** The record of the baja; `null` while the client is in force. */
  get deactivation(): Deactivation | null {
    return this._deactivation;
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

  get document(): ClientDocument {
    return this._document;
  }

  get address(): string {
    return this._address;
  }

  get phone(): string {
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

  /** An optional text field: trimmed, and `null` when nothing is left. */
  private static blankToNull(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? "";
    return trimmed.length === 0 ? null : trimmed;
  }
}
