import { InterruptiveAct } from '../entities/interruptive-act';

/** DI token for {@link InterruptiveActRepository}. */
export const INTERRUPTIVE_ACT_REPOSITORY = Symbol('INTERRUPTIVE_ACT_REPOSITORY');

/**
 * Persistence port for the interruptive acts of a case (HU31). It only
 * writes: an interruptive act changes nothing stored in the case, because its
 * effect on the prescription is computed on every read.
 */
export interface InterruptiveActRepository {
  /** Reserves the next primary key, so the use case can build the act with its id. */
  nextId(): Promise<number>;

  /** Inserts a new act. */
  save(act: InterruptiveAct): Promise<void>;
}
