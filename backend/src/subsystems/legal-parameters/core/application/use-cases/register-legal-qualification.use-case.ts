import { Inject, Injectable } from '@nestjs/common';
import { LegalQualification } from '../../domain/entities/legal-qualification';
import { LegalQualificationAlreadyExistsError } from '../../domain/errors/legal-parameters.errors';
import { LegalQualificationRepository } from '../../domain/ports/legal-qualification.repository';

export type RegisterLegalQualificationCommand = {
  name: string;
  prescriptionMonths: number;
};

export type RegisterLegalQualificationResult = { qualification: LegalQualification };

/**
 * HU-48 — registers a legal qualification with its prescription term
 * (contract §3.5).
 *
 * Registering one creates **nothing else**: no case is touched and
 * the qualification starts with zero active cases until it is
 * assigned to a criminal case (CA-48.7). That is why there is no
 * transaction here — a single insert, the same reasoning as
 * `RegisterClient`.
 */
@Injectable()
export class RegisterLegalQualification {
  constructor(
    @Inject(LegalQualificationRepository)
    private readonly qualifications: LegalQualificationRepository,
  ) {}

  async execute(
    command: RegisterLegalQualificationCommand,
  ): Promise<RegisterLegalQualificationResult> {
    // Trimmed before comparing: `  Hurto simple ` and `Hurto simple`
    // are the same denomination, and matching the raw input would let
    // both through as two different qualifications — the duplicate
    // CA-48.4 exists to prevent.
    const name = command.name?.trim() ?? '';

    // The partial unique index is what actually holds under
    // concurrency; this check exists so the caller gets the contract's
    // 409 instead of a raw constraint violation.
    //
    // Guarded on a non-empty name so an empty one does not spend a
    // query before `create` rejects it below: "ya existe" would be a
    // misleading answer to a missing field (CA-48.5 vs CA-48.4).
    if (name.length > 0 && (await this.qualifications.existsActiveByName(name))) {
      throw new LegalQualificationAlreadyExistsError();
    }

    const id = await this.qualifications.nextId();
    const qualification = LegalQualification.create({
      id,
      name,
      prescriptionMonths: command.prescriptionMonths,
      isActive: true,
      createdAt: null,
    });

    await this.qualifications.save(qualification);

    return { qualification };
  }
}
