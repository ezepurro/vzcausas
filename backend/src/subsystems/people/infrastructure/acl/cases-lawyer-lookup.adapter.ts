import { Inject, Injectable } from "@nestjs/common";
import {
  LawyerLookupPort,
  LawyerRef,
} from "@subsystems/cases/core/domain/ports/lawyer-lookup.port";
import {
  LAWYER_REPOSITORY,
  LawyerRepository,
} from "../../core/domain/ports/lawyer.repository";

/**
 * Implements the {@link LawyerLookupPort} that `cases` defines, with the
 * lawyers this subsystem owns. It translates its own `Lawyer` into the
 * smaller `LawyerRef` `cases` works with, so `cases` never depends on this
 * subsystem's domain.
 *
 * A deactivated lawyer counts as non-existent (RN12): no case can be
 * assigned to it.
 */
@Injectable()
export class CasesLawyerLookupAdapter implements LawyerLookupPort {
  constructor(
    @Inject(LAWYER_REPOSITORY) private readonly lawyers: LawyerRepository,
  ) {}

  async findActiveById(id: number): Promise<LawyerRef | null> {
    const lawyer = await this.lawyers.findById(id);
    if (!lawyer || !lawyer.isActive()) {
      return null;
    }
    return {
      id: lawyer.id,
      fullName: lawyer.fullName,
      registrationNumber: lawyer.registrationNumber.toString(),
    };
  }
}
