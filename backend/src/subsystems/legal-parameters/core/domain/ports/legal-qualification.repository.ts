import { QualificationFilter } from '../../application/common/get-qualifications.interfaces';
import { LegalQualification } from '../entities/legal-qualification';
import { PaginatedResult } from '@shared/domain/paginated-result';

export interface LegalQualificationRepository {
  /** Reserves the next identity value, so the entity is whole before it is saved. */
  nextId(): Promise<number>;
  save(qualification: LegalQualification): Promise<void>;
  /** Current qualifications only, ordered by `name` (CA-47.3, CA-47.9). */
  findPaginated(
    filter: QualificationFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<LegalQualification>>;
  /** `null` for a qualification that does not exist **or** was given up (CA-47.9). */
  findActiveById(id: number): Promise<LegalQualification | null>;
  /**
   * Mirrors the partial unique index over `lower(name)`: case is
   * ignored and only current qualifications count, so one given up
   * releases its denomination (CA-48.4).
   *
   * `excludingId` lets `UpdateLegalQualification` check without colliding
   * with the qualification being renamed ("hurto simple" → "Hurto simple",
   * CA-49.2).
   */
  existsActiveByName(name: string, excludingId?: number): Promise<boolean>;
  /**
   * Writes the mutable fields of a **current** qualification: name,
   * prescription term and the active flag (HU49, HU50). Returns `false`
   * when nothing was written because the row is no longer current — given
   * up between the read and the write — so the use case answers 404 instead
   * of modifying a qualification that, for the client, no longer exists.
   * There is no `delete`: qualifications are never physically removed (RN12).
   */
  update(qualification: LegalQualification): Promise<boolean>;
}

export const LegalQualificationRepository = Symbol('LegalQualificationRepository');
