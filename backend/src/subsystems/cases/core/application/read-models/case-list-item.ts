/**
 * Flat projection of a case for `GET /cases`.
 *
 * **Not the aggregate.** `Case` is abstract with one subclass per
 * jurisdiction, and rebuilding it only to flatten it into a DTO is
 * what §"Modelos de lectura" of the architecture warns against:
 * *"forzarlos a pasar por los agregados produce código lento y
 * retorcido sin ningún beneficio de integridad, porque no escriben
 * nada"*. That decision is written for `reporting`; this extends it to
 * a read-only query in `cases`, and is worth the team confirming.
 *
 * Carries what CA-9.4 asks for — the case, its client, its responsible
 * lawyer, its current procedural state and its due date — and nothing
 * else. The contract's full `GET /cases` payload belongs to HU-20.
 */
export type CaseListItem = {
  id: number;
  sacNumber: string | null;
  caption: string;
  court: string | null;
  startDate: Date;
  active: boolean;

  client: {
    id: number;
    lastName: string;
    firstName: string;
    dni: string;
  };

  responsibleLawyer: {
    id: number;
    fullName: string;
    registrationNumber: string;
  };

  /**
   * The state the case is in right now, from the table or written by
   * hand. `null` for a case still in its initial state, which has no
   * procedural act yet.
   */
  currentState: CurrentStateView | null;
};

export type CurrentStateView = {
  /** `null` when the state was written by hand rather than chosen. */
  proceduralStateId: number | null;
  name: string;
  custom: boolean;
  /**
   * The deadline in force: the lawyer's manual adjustment when there
   * is one, otherwise the date derived from the table — the
   * `COALESCE(manual, computed)` the schema documents. `null` when the
   * state opens no deadline.
   *
   * `businessDaysRemaining`, which the contract also shows, is **not**
   * here: computing it needs the judicial calendar of non-business
   * days, and neither that table nor the `deadlines` subsystem exist
   * yet. It arrives with HU-20.
   */
  dueDate: Date | null;
};
