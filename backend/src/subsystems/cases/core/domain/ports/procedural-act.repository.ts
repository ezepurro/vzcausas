import { ProceduralAct } from '../entities/procedural-act';

/** DI token for {@link ProceduralActRepository}. Symbol-as-token, same as the other ports. */
export const PROCEDURAL_ACT_REPOSITORY = Symbol('PROCEDURAL_ACT_REPOSITORY');

/**
 * Persistence port for the procedural acts of a case. It only touches the acts:
 * what an act changes in the case (its current state and current act) is saved
 * through the {@link CaseRepository}, so a use case can do both in a transaction.
 */
export interface ProceduralActRepository {
  /** Reserves the next primary key, so the use case can build the act with its id. */
  nextId(): Promise<number>;

  /** Inserts a new act. */
  save(act: ProceduralAct): Promise<void>;
}
