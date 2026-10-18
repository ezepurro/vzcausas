import { Inject, Injectable } from '@nestjs/common';
import { ActiveCasesCounterPort } from '../../domain/ports/active-cases-counter.port';
import { LegalQualificationRepository } from '../../domain/ports/legal-qualification.repository';
import { GetQualificationsInput, QualificationFilter } from '../common/get-qualifications.interfaces';
import { LegalQualificationWithActiveCases } from '../read-models/legal-qualification-with-active-cases';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';

/**
 * HU-47 — lists the current legal qualifications (contract §3.5).
 *
 * An empty page is not an error (CA-47.6): a search that matches
 * nothing answers 200 with an empty collection and `totalItems: 0`.
 * Filtering out the ones given up is the repository's job, so no
 * caller can forget it (CA-47.9).
 *
 * `activeCases` (CA-47.8) is asked of `cases` for the whole page in a single
 * call, never one per qualification.
 */
@Injectable()
export class ViewLegalQualifications {
  constructor(
    @Inject(LegalQualificationRepository)
    private readonly qualificationRepo: LegalQualificationRepository,
    @Inject(ActiveCasesCounterPort)
    private readonly activeCasesCounter: ActiveCasesCounterPort,
  ) {}

  async getAll(
    queryParams: GetQualificationsInput,
  ): Promise<PaginatedResult<LegalQualificationWithActiveCases>> {
    const filter: QualificationFilter = {
      // An all-blank search is "no filter", not a search for blanks.
      search: queryParams.search?.trim() || undefined,
    };
    const page = await this.qualificationRepo.findPaginated(filter, queryParams.page, queryParams.limit);

    // An empty page needs no counts: skip the call to `cases`.
    const counts =
      page.items.length > 0
        ? await this.activeCasesCounter.countByQualifications(page.items.map((item) => item.id))
        : new Map<number, number>();

    return {
      ...page,
      items: page.items.map((qualification) => ({
        qualification,
        activeCases: counts.get(qualification.id) ?? 0,
      })),
    };
  }
}
