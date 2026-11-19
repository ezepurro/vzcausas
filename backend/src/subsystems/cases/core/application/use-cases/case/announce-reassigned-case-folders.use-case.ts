import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { CaseFolderAnnouncer } from './case-folder-announcer';

/**
 * HU15 — after the baja of a lawyer commits, tells `documents` that the folder of each
 * reassigned case has to follow it: to the new lawyer or, if the case is orphaned, to
 * `Sin asignar` (D-143, D-104). The announcement reads the case as it was **saved**, so
 * this runs after the commit and not inside the transaction.
 *
 * **It never throws**: the baja is already saved, so a case that cannot be announced is
 * logged and its folder is corrected later (D-60). {@link CaseFolderAnnouncer} already
 * skips a case whose folder does not exist.
 */
@Injectable()
export class AnnounceReassignedCaseFolders {
  private readonly logger = new Logger(AnnounceReassignedCaseFolders.name);

  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly folderAnnouncer: CaseFolderAnnouncer,
  ) {}

  async execute(caseIds: readonly number[]): Promise<void> {
    const now = this.clock.now();
    for (const caseId of caseIds) {
      try {
        const reassigned = await this.cases.findById(caseId);
        if (reassigned) {
          await this.folderAnnouncer.announce(reassigned, ['responsibleLawyer'], now);
        }
      } catch (error) {
        this.logger.error(`Could not announce the folder change of case ${caseId}: ${String(error)}`);
      }
    }
  }
}
