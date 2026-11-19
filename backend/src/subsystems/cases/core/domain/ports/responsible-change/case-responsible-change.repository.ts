import { CaseResponsibleChange } from '../../entities/case-responsible-change.entity';

/** DI token for {@link CaseResponsibleChangeRepository}. */
export const CASE_RESPONSIBLE_CHANGE_REPOSITORY = Symbol('CASE_RESPONSIBLE_CHANGE_REPOSITORY');

/**
 * Persistence port for the changes of responsible of a case (HU27, D-147).
 * Written in the same transaction as the change itself; read by the line of life
 * through its own query port.
 */
export interface CaseResponsibleChangeRepository {
  /** Inserts a new record. It never updates or deletes one (RN12). */
  save(change: CaseResponsibleChange): Promise<void>;
}
