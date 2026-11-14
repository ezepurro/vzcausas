import { Inject, Injectable } from '@nestjs/common';
import { LegalQualification } from '../../domain/entities/legal-qualification';
import {
  LegalQualificationAlreadyExistsError,
  LegalQualificationEmptyPatchError,
  LegalQualificationNotFoundError,
} from '../../domain/errors/legal-parameters.errors';
import { LegalQualificationRepository } from '../../domain/ports/legal-qualification.repository';

/**
 * Partial update: `undefined` means "leave as is" (CA-49.1). There is no
 * `activeCases` nor `active`: the first is counted, not stored (CA-49.5),
 * and the second only changes through `DELETE`, never back (CA-50.1). The
 * HTTP layer rejects both before reaching here.
 */
export type UpdateLegalQualificationCommand = {
  id: number;
  name?: string;
  prescriptionMonths?: number;
};

export type UpdateLegalQualificationResult = { qualification: LegalQualification };

/**
 * HU49 — partially updates a legal qualification (contract §3.5).
 *
 * - CA-49.1, at least one field: checked first, before looking anything up.
 * - CA-49.6, not found or given up: one 404 for both (CA-47.9).
 * - CA-49.2 and CA-49.3, the rules of the alta: the entity's.
 * - CA-49.2, unique among current ones: checked here, excluding the
 *   qualification itself; the partial unique index holds under concurrency.
 * - CA-49.4, the cases recompute their prescription: nothing to do here.
 *   They reference the qualification and compute on every read (D-08).
 * - CA-49.5, `activeCases` is not touched: it is not stored.
 *
 * No transaction: a single conditional write on one row, the same reasoning
 * as `RegisterLegalQualification`.
 */
@Injectable()
export class UpdateLegalQualification {
  constructor(
    @Inject(LegalQualificationRepository)
    private readonly qualifications: LegalQualificationRepository,
  ) {}

  async execute(command: UpdateLegalQualificationCommand): Promise<UpdateLegalQualificationResult> {
    if (command.name === undefined && command.prescriptionMonths === undefined) {
      throw new LegalQualificationEmptyPatchError();
    }

    const qualification = await this.qualifications.findActiveById(command.id);
    if (qualification === null) {
      throw new LegalQualificationNotFoundError();
    }

    // Both changes are applied before any check against the collection, so
    // an invalid term is reported as such even if the name is also taken,
    // and nothing is written unless every field is valid.
    if (command.prescriptionMonths !== undefined) {
      qualification.changePrescriptionMonths(command.prescriptionMonths);
    }
    if (command.name !== undefined) {
      // The entity validates and trims first, so the uniqueness check runs
      // against the name it will keep, and a blank one is reported as
      // missing rather than as repeated (L-07).
      qualification.rename(command.name);
      if (await this.qualifications.existsActiveByName(qualification.name, qualification.id)) {
        throw new LegalQualificationAlreadyExistsError();
      }
    }

    // `false`: it was given up between the read and the write. For the
    // client it no longer exists, so it gets the same 404 (CA-49.6).
    if (!(await this.qualifications.update(qualification))) {
      throw new LegalQualificationNotFoundError();
    }

    return { qualification };
  }
}
