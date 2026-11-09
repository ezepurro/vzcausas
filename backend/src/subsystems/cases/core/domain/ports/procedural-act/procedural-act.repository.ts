import { ProceduralAct } from '../../entities/procedural-act.entity';

/** DI token for {@link ProceduralActRepository}. Symbol-as-token, same as the other ports. */
export const PROCEDURAL_ACT_REPOSITORY = Symbol('PROCEDURAL_ACT_REPOSITORY');

/**
 * A procedural act as its readers need it (HU27): the act plus the two names
 * it only holds as identifiers — the state it moved the case to and the
 * lawyer who registered it.
 *
 * It is **exactly** what `ProceduralActHttpMapper.toResponse` reads, and
 * `RegisterProceduralActResult` satisfies it structurally. That is the point:
 * the `POST` that registers an act and the `GET`s that read it go through the
 * same function, so the contract's "same resource" cannot drift between them.
 */
export type ProceduralActView = {
  act: ProceduralAct;
  /** The state of the table, or the hand-written text. A deactivated state still shows (§4, Bajas). */
  resultingStateName: string;
  registeredBy: { lastName: string; firstName: string };
  /** The user who last modified it (HU28). Absent or `null` while it was never modified. */
  lastModifiedBy?: { lastName: string; firstName: string } | null;
};

export type ProceduralActPage = { items: ProceduralActView[]; totalItems: number };

/**
 * Persistence port for the procedural acts of a case: writing them (HU26) and
 * reading them (HU27). What an act changes in the case (its current state and
 * current act) is saved through the `CaseRepository`, so a use case can do
 * both in a transaction.
 */
export interface ProceduralActRepository {
  /** Reserves the next primary key, so the use case can build the act with its id. */
  nextId(): Promise<number>;

  /** Inserts a new act. */
  save(act: ProceduralAct): Promise<void>;

  /** Whether an **active** case has that id. A case given de baja answers `false` (§4, Bajas). */
  caseExists(caseId: number): Promise<boolean>;

  /**
   * One page of a case's acts, newest first: by `actDate` descending and, on
   * the same date, by `id` descending — the last one registered first
   * (CA-27.2). The `procedural_acts` index is built in exactly that order.
   */
  listByCase(caseId: number, page: number, limit: number): Promise<ProceduralActPage>;

  /** The act with that id **if it belongs to that case**; `null` otherwise. */
  findInCase(caseId: number, actId: number): Promise<ProceduralActView | null>;

  /** Writes a modified act (HU28): its data, its deadline and who modified it and when. */
  saveModification(act: ProceduralAct): Promise<void>;

  /**
   * The most recent act of the case other than `exceptActId`: by `actDate` and,
   * on the same date, the last registered (D-14). `null` if the case has no other.
   */
  findLatestInCaseExcept(caseId: number, exceptActId: number): Promise<ProceduralAct | null>;
}
