/** The fields of a lawyer that `PATCH /lawyers/{lawyerId}` can change (HU14). */
export type LawyerField = "lastName" | "firstName" | "registrationNumber";

/** Same order as the form and the contract, so the audit record always lists them alike. */
const FIELD_ORDER: readonly LawyerField[] = ["lastName", "firstName", "registrationNumber"];

/**
 * What a modification actually changed: the fields whose value is now
 * different. A field sent with the value it already had is not a change.
 *
 * Returned by `Lawyer.update` so the use case does not have to compare
 * anything: it hands {@link fields} to the audit trail (CA-14.5) and asks
 * {@link renamesLawyer} whether the lawyer's Drive folder has to follow
 * (CA-14.12, D-104).
 */
export class LawyerChangeSet {
  private constructor(private readonly changed: readonly LawyerField[]) {}

  static of(changed: Iterable<LawyerField>): LawyerChangeSet {
    const set = new Set(changed);
    return new LawyerChangeSet(FIELD_ORDER.filter((field) => set.has(field)));
  }

  /** The changed fields, in the form's order. Names only: never their values (audit §4). */
  get fields(): readonly LawyerField[] {
    return this.changed;
  }

  /** Nothing changed: every field sent already had that value. */
  isEmpty(): boolean {
    return this.changed.length === 0;
  }

  /** The last name or the first names changed: the name the lawyer goes by is different. */
  renamesLawyer(): boolean {
    return this.changed.includes("lastName") || this.changed.includes("firstName");
  }
}
