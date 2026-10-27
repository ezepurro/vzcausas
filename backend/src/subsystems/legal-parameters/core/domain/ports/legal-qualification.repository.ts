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
   */
  existsActiveByName(name: string): Promise<boolean>;
}

export const LegalQualificationRepository = Symbol('LegalQualificationRepository');
