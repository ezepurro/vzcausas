import { Case } from '../entities/cases';
import { ProceduralStateRef } from './legal-parameters-lookup.port';

/** DI token for {@link CaseRepository}. Symbol-as-token, same as `people`. */
export const CASE_REPOSITORY = Symbol('CASE_REPOSITORY');

/** Persistence port for the {@link Case} aggregate. */
export interface CaseRepository {
  /** Reserves the next primary key, so the use case can build the case with its id. */
  nextId(): Promise<number>;

  /** `true` if the SAC number is already used by any case, including inactive ones (RN2). */
  existsBySacNumber(sacNumber: string): Promise<boolean>;

  /** Inserts a new case together with its offenses. */
  save(newCase: Case): Promise<void>;

  /** Loads a case by primary key, with its current procedural act (not the whole history). Returns `null` if none. */
  findById(id: number): Promise<Case | null>;

  /** Reads the procedural state the stored case is currently in. */
  findCurrentState(caseId: number): Promise<ProceduralStateRef>;

  /**
   * Saves what a procedural act changed in the case: its current state, its
   * current act and `updatedAt`. The act itself is saved by the
   * {@link ProceduralActRepository}.
   */
  saveCurrentAct(updatedCase: Case): Promise<void>;
}
