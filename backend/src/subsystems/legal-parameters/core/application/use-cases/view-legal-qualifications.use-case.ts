import { Inject, Injectable } from '@nestjs/common';
import { LegalQualification } from '../../domain/entities/legal-qualification';
import { LegalQualificationRepository } from '../../domain/ports/legal-qualification.repository';
import { GetQualificationsInput, QualificationFilter } from '../common/get-qualifications.interfaces';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';

/**
 * HU-47 — lists the current legal qualifications (contract §3.5).
 *
 * An empty page is not an error (CA-47.6): a search that matches
 * nothing answers 200 with an empty collection and `totalItems: 0`.
 * Filtering out the ones given up is the repository's job, so no
 * caller can forget it (CA-47.9).
 */
@Injectable()
export class ViewLegalQualifications {
  constructor(
    @Inject(LegalQualificationRepository)
    private readonly qualificationRepo: LegalQualificationRepository,
  ) {}

  async getAll(queryParams: GetQualificationsInput): Promise<PaginatedResult<LegalQualification>> {
    const filter: QualificationFilter = {
      // An all-blank search is "no filter", not a search for blanks.
      search: queryParams.search?.trim() || undefined,
    };
    return await this.qualificationRepo.findPaginated(filter, queryParams.page, queryParams.limit);
  }
}
