import { Inject, Injectable } from '@nestjs/common';
import { LawyerCasesPort, LawyerCasesReassignment } from '@subsystems/people/core/domain/ports/lawyer-cases.port';
import { AnnounceReassignedCaseFolders } from '../../core/application/use-cases/case/announce-reassigned-case-folders.use-case';
import { ReassignLawyerCases } from '../../core/application/use-cases/case/reassign-lawyer-cases.use-case';
import { CASE_REPOSITORY, CaseRepository } from '../../core/domain/ports/case/case.repository';

/**
 * Implements the {@link LawyerCasesPort} that `people` declares, so giving a lawyer de baja
 * (HU15, D-143) can hand their cases to other lawyers or leave them orphaned without
 * `people` knowing what a case is. Which cases are active, what a reassignment records and
 * what happens to the folder are `cases`' rules: this only translates the port into its
 * use cases and the repository.
 */
@Injectable()
export class PeopleLawyerCasesAdapter implements LawyerCasesPort {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    private readonly reassignLawyerCases: ReassignLawyerCases,
    private readonly announceFolders: AnnounceReassignedCaseFolders,
  ) {}

  findActiveCaseIdsOf(lawyerId: number): Promise<number[]> {
    return this.cases.findActiveIdsByResponsibleLawyer(lawyerId);
  }

  countCasesInForceOf(lawyerId: number): Promise<number> {
    return this.cases.countInForceByResponsibleLawyer(lawyerId);
  }

  reassign(order: LawyerCasesReassignment): Promise<void> {
    return this.reassignLawyerCases.execute(order);
  }

  announceFolderMoves(caseIds: readonly number[]): Promise<void> {
    return this.announceFolders.execute(caseIds);
  }
}
