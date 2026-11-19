import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_TRAIL, AuditTrailPort } from '@shared/domain/audit-trail.port';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';

export interface ReassignLawyerCasesCommand {
  /** The lawyer given de baja: every case must be an active one of theirs. */
  fromLawyerId: number;
  /** `responsibleLawyerId` `null` leaves the case orphaned (D-143). */
  reassignments: readonly { caseId: number; responsibleLawyerId: number | null }[];
  /** Whoever gives the lawyer de baja, for the audit record of each case. */
  actorUserId: number;
}

/**
 * HU15 — the cases of a lawyer given de baja go to other lawyers or are left orphaned
 * (D-143). Each one is a change of responsible with the same effects as
 * `PATCH /cases/{caseId}`: the case is saved and the change stays in its audit record.
 *
 * Coordinates and decides nothing: moving a case to another lawyer, or leaving it
 * without one, is `Case.reassignTo` and `Case.leaveWithoutResponsible`. Which lawyers
 * are valid targets, and that the distribution covers every active case, belong to
 * `people`, which asks for this; it is **called inside the transaction of the baja**, so
 * the cases and the lawyer are written all together or not at all. Nothing goes to Drive
 * here (see {@link AnnounceReassignedCaseFolders}).
 */
@Injectable()
export class ReassignLawyerCases {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(AUDIT_TRAIL) private readonly auditTrail: AuditTrailPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /**
   * @throws {Error} a case that is not an active one of `fromLawyerId`: the caller checked it,
   *   so it is broken data and not a user error. The transaction undoes what was written.
   */
  async execute(command: ReassignLawyerCasesCommand): Promise<void> {
    const now = this.clock.now();

    for (const { caseId, responsibleLawyerId } of command.reassignments) {
      const target = await this.cases.findById(caseId);
      if (!target || !target.active || target.responsibleLawyerId !== command.fromLawyerId) {
        throw new Error(`The case ${caseId} is not an active case of the lawyer ${command.fromLawyerId}.`);
      }

      if (responsibleLawyerId === null) {
        target.leaveWithoutResponsible(now);
      } else {
        target.reassignTo(responsibleLawyerId, now);
      }

      await this.cases.saveModification(target);
      await this.auditTrail.record({
        actorUserId: command.actorUserId,
        action: 'case.updated',
        entityType: 'Case',
        entityId: String(target.id),
        occurredAt: now,
        // The names of the fields, never their values (audit §4).
        metadata: { changedFields: ['responsibleLawyerId'] },
      });
    }
  }
}
