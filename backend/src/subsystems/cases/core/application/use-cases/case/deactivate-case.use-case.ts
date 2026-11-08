import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUDIT_TRAIL, AuditTrailPort } from '@shared/domain/audit-trail.port';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { TRANSACTION_MANAGER, TransactionManagerPort } from '@shared/domain/transaction-manager.port';
import { EventPublisher } from '@shared/infrastructure/events/event-publisher.port';
import { createEventHeader } from '@shared/infrastructure/events/integration-event';
import { CaseNotFoundError, NotResponsibleLawyerError } from '../../../domain/errors/case.errors';
import { CASE_FOLDER_STATE, CaseFolderStatePort } from '../../../domain/ports/case/case-folder-state.port';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { CASE_DEACTIVATED, CaseDeactivatedEvent } from '../../../domain/ports/events/case-deactivated.event';
import { CaseDeactivation, CaseDeactivationInput } from '../../../domain/value-objects/case/case-deactivation.vo';

export interface DeactivateCaseCommand {
  caseId: number;
  /** What the form sends; the whole body is optional (CA-21.2). */
  input: CaseDeactivationInput;
  /** Who gives it de baja, for the record and the audit (CA-21.3). Only who operates the case may (D-110). */
  actor: AuthenticatedUser;
}

/**
 * HU21 — gives a case de baja (contract V5, `DELETE /cases/{caseId}`).
 *
 * Coordinates and decides nothing: what a valid baja is belongs to
 * {@link CaseDeactivation} and {@link Case.deactivate}. The case exists (404) →
 * the actor operates it (403, D-110) → the reason (400) → the baja and its audit record, in one transaction.
 *
 * The case's Drive folder moves to the `Papelera` folder, with what is inside
 * it (D-104, revised; it replaces CA-21.8). It is announced **after** the commit
 * and never fails the request: if Drive is down the baja stands and the folder
 * stays where it was. Everything else the baja turns off — listings,
 * subresources, counts, dashboards, the daily process — already reads only
 * active cases.
 */
@Injectable()
export class DeactivateCase {
  private readonly logger = new Logger(DeactivateCase.name);

  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(AUDIT_TRAIL) private readonly auditTrail: AuditTrailPort,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManagerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(CASE_FOLDER_STATE) private readonly folderState: CaseFolderStatePort,
    private readonly events: EventPublisher,
  ) {}

  /**
   * @throws {CaseNotFoundError} 404, also for a case already given de baja,
   *   even if another request gave it de baja a moment ago (CA-21.5).
   * @throws {NotResponsibleLawyerError} 403, a lawyer who is not the responsible one (D-110).
   * @throws {ValidationError} 400, a reason longer than 500 characters (CA-21.2).
   */
  async execute(command: DeactivateCaseCommand): Promise<void> {
    const target = await this.cases.findById(command.caseId);
    if (!target || !target.active) {
      throw new CaseNotFoundError();
    }

    target.assertCanBeOperatedBy(command.actor, NotResponsibleLawyerError.FOR_DEACTIVATING_CASE);

    const now = this.clock.now();
    target.deactivate(
      CaseDeactivation.create(command.input, { deactivatedByUserId: command.actor.userId, deactivatedAt: now }),
    );

    await this.transactions.runInTransaction(async () => {
      if (!(await this.cases.saveDeactivation(target))) {
        throw new CaseNotFoundError();
      }
      // The reason stays in the case: it is free text (audit §4).
      await this.auditTrail.record({
        actorUserId: command.actor.userId,
        action: 'case.deactivated',
        entityType: 'Case',
        entityId: String(target.id),
        occurredAt: now,
      });
    });

    await this.announceFolderRecycle(target.id, now);
  }

  /**
   * Only a folder that exists can be trashed, and the case is already saved: a
   * failure here is logged and the folder is left as it is (D-104).
   */
  private async announceFolderRecycle(caseId: number, occurredAt: Date): Promise<void> {
    try {
      const folder = await this.folderState.find(caseId);
      if (folder?.status !== 'CREATED') {
        return;
      }
      const event: CaseDeactivatedEvent = { ...createEventHeader(CASE_DEACTIVATED, occurredAt), caseId };
      await this.events.publish(event);
    } catch (error) {
      this.logger.error(`Could not announce the baja of case ${caseId} for its folder: ${String(error)}`);
    }
  }
}
