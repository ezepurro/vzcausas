/** The fields of a client that `PATCH /clients/{clientId}` can change (HU10). */
export type ClientField =
  | "lastName"
  | "firstName"
  | "documentType"
  | "documentNumber"
  | "address"
  | "phone"
  | "email";

/** Same order as the form and the contract, so the audit record always lists them alike. */
export const CLIENT_FIELDS: readonly ClientField[] = [
  "lastName",
  "firstName",
  "documentType",
  "documentNumber",
  "address",
  "phone",
  "email",
];

/**
 * What a modification actually changed: the fields whose value is now
 * different. A field sent with the value it already had is not a change.
 *
 * Returned by `Client.update` so the use case does not have to compare
 * anything: it hands {@link fields} to the audit trail (CA-10.5) and asks
 * {@link renamesClient} whether the captions of the client's cases have to
 * follow (CA-10.9, D-121). Same role as `LawyerChangeSet`.
 */
export class ClientChangeSet {
  private constructor(private readonly changed: readonly ClientField[]) {}

  static of(changed: Iterable<ClientField>): ClientChangeSet {
    const set = new Set(changed);
    return new ClientChangeSet(CLIENT_FIELDS.filter((field) => set.has(field)));
  }

  /** The changed fields, in the form's order. Names only: never their values (audit §4). */
  get fields(): readonly ClientField[] {
    return this.changed;
  }

  /** Nothing changed: every field sent already had that value. */
  isEmpty(): boolean {
    return this.changed.length === 0;
  }

  /**
   * The last name or the first names changed: the captions that begin with
   * the client's name have to follow (CA-10.9). The document, the address, the
   * phone or the email change no caption.
   */
  renamesClient(): boolean {
    return this.changed.includes("lastName") || this.changed.includes("firstName");
  }
}
