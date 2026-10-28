import { InterruptiveAct } from '../entities/interruptive-act';

/** DI token for {@link InterruptiveActRepository}. */
export const INTERRUPTIVE_ACT_REPOSITORY = Symbol('INTERRUPTIVE_ACT_REPOSITORY');

/**
 * An interruptive act as its readers need it: the act plus the name of the
 * lawyer who registered it, which it only holds as an id. The `POST` that
 * registers an act and the `GET` that lists them both go out through this
 * shape, so the resource cannot drift between them — the same idea as
 * `ProceduralActView`.
 */
export type InterruptiveActView = {
  act: InterruptiveAct;
  registeredBy: { lastName: string; firstName: string };
};

export type InterruptiveActPage = { items: InterruptiveActView[]; totalItems: number };

/**
 * Persistence port for the interruptive acts of a case (HU31, CA-31.12). An
 * interruptive act changes nothing stored in the case, because its effect on
 * the prescription is computed on every read.
 */
export interface InterruptiveActRepository {
  /** Reserves the next primary key, so the use case can build the act with its id. */
  nextId(): Promise<number>;

  /** Inserts a new act. */
  save(act: InterruptiveAct): Promise<void>;

  /** Whether an **active** case has that id. A case given de baja answers `false` (§4, Bajas). */
  caseExists(caseId: number): Promise<boolean>;

  /**
   * One page of a case's interruptive acts, newest first: by `actDate`
   * descending and, on the same date, by `id` descending. The first one is the
   * act that governs the prescription. A case outside `CRIMINAL` simply has
   * none, so it answers an empty page rather than an error.
   */
  listByCase(caseId: number, page: number, limit: number): Promise<InterruptiveActPage>;
}
