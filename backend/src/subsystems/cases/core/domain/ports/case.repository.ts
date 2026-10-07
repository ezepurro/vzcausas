import { Case } from '../entities/cases';
<<<<<<< HEAD
import { ProceduralStateRef } from './legal-parameters-lookup.port';
=======
import { ProceduralAct } from '../entities/procedural-act';
import { ProceduralStateRef } from './proc-state-lookup.port';
>>>>>>> 178097f (feat(back): register proc act - entities & usecase created)

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

  /** Reserves the next primary key of a procedural act. */
  nextProceduralActId(): Promise<number>;

  /**
   * Saves a new act and, in the same atomic operation, the changes the act
   * made to the case: its current state, its current act and `updatedAt`.
   * If the act did not become the current one, only the act is saved.
   */
  saveProceduralAct(updatedCase: Case, act: ProceduralAct): Promise<void>;
}
