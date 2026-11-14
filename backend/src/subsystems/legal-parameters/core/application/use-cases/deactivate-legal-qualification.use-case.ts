import { Inject, Injectable } from '@nestjs/common';
import { LegalQualificationNotFoundError } from '../../domain/errors/legal-parameters.errors';
import { LegalQualificationRepository } from '../../domain/ports/legal-qualification.repository';

export type DeactivateLegalQualificationCommand = { id: number };

/**
 * HU50 — logically deletes a legal qualification (RN12, contract §3.5). The
 * row is kept; for the client the qualification simply ceases to exist.
 *
 * - CA-50.1: once inactive, the repository no longer returns it, so it
 *   leaves the listing and its `GET` answers 404. Nothing reactivates it.
 * - CA-50.2: the case forms stop offering it through the same filter
 *   (`findActiveById` in `CasesLegalParametersLookupAdapter`).
 * - CA-50.3: goes through even if cases register it, with no 409. Nothing to
 *   check or update on them: their offenses keep pointing to the row.
 * - CA-50.4: giving up one that is already given up answers 404, not a
 *   no-op: the caller must not tell "I just did it" from "it was gone".
 */
@Injectable()
export class DeactivateLegalQualification {
  constructor(
    @Inject(LegalQualificationRepository)
    private readonly qualifications: LegalQualificationRepository,
  ) {}

  async execute(command: DeactivateLegalQualificationCommand): Promise<void> {
    const qualification = await this.qualifications.findActiveById(command.id);
    if (qualification === null) {
      throw new LegalQualificationNotFoundError();
    }

    qualification.deactivate();

    // `false`: another request gave it up between the read and the write.
    // Same answer as if it had already been gone (CA-50.4).
    if (!(await this.qualifications.update(qualification))) {
      throw new LegalQualificationNotFoundError();
    }
  }
}
