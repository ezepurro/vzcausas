import { ProceduralAct } from '../entities/procedural-act';

/** DI token for {@link ProceduralActQueryPort}. */
export const PROCEDURAL_ACT_QUERY = Symbol('PROCEDURAL_ACT_QUERY');

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
};

export type ProceduralActPage = { items: ProceduralActView[]; totalItems: number };

/**
 * Read port for the procedural acts of a case (HU27), apart from
 * {@link ProceduralActRepository}, which only writes them.
 *
 * Separate from `CaseQueryPort` as well, on purpose: adding these methods
 * there would force every test double of that port to grow them, and none of
 * those doubles has anything to do with acts.
 */
export interface ProceduralActQueryPort {
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
}
