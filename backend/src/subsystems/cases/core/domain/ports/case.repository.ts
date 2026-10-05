import { Case } from '../entities/cases';

/** DI token for {@link CaseRepository}. Symbol-as-token, same as `people`. */
export const CASE_REPOSITORY = Symbol('CASE_REPOSITORY');

/** Persistence port for the {@link Case} aggregate. */
export interface CaseRepository {
  /** Reserves the next primary key, so the use case can build the case with its id. */
  nextId(): Promise<number>;

  /** `true` if the SAC number is already used by any case, including inactive ones (RN2). */
  existsBySacNumber(sacNumber: string): Promise<boolean>;

  /** Inserts a new case together with its legal qualifications. */
  save(newCase: Case): Promise<void>;

  /** Loads a case by primary key. Returns `null` if none. */
  findById(id: number): Promise<Case | null>;
}
