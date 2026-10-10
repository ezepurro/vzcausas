import { Inject, Injectable } from '@nestjs/common';
import { LegalQualificationNotFoundError } from '../../domain/errors/legal-parameters.errors';
import { ActiveCasesCounterPort } from '../../domain/ports/active-cases-counter.port';
import { LegalQualificationRepository } from '../../domain/ports/legal-qualification.repository';
import { LegalQualificationWithActiveCases } from '../read-models/legal-qualification-with-active-cases';

export type FindLegalQualificationQuery = { id: number };

export type FindLegalQualificationResult = LegalQualificationWithActiveCases;

/**
 * HU-47 — consults one legal qualification (CA-47.7).
 *
 * Asks the repository for a **current** one, so a qualification given
 * up answers 404 like one that never existed (CA-47.9). Returning it
 * with `active: false` would be a different answer to the same
 * question and would leak the catalogue's history to a listing that
 * must not show it.
 */
@Injectable()
export class FindLegalQualification {
  constructor(
    @Inject(LegalQualificationRepository)
    private readonly qualifications: LegalQualificationRepository,
    @Inject(ActiveCasesCounterPort)
    private readonly activeCasesCounter: ActiveCasesCounterPort,
  ) {}

  async execute(query: FindLegalQualificationQuery): Promise<FindLegalQualificationResult> {
    const qualification = await this.qualifications.findActiveById(query.id);

    if (qualification === null) {
      throw new LegalQualificationNotFoundError();
    }

    const counts = await this.activeCasesCounter.countByQualifications([qualification.id]);
    return { qualification, activeCases: counts.get(qualification.id) ?? 0 };
  }
}
