import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_TRAIL, AuditTrailPort } from '@shared/domain/audit-trail.port';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { TRANSACTION_MANAGER, TransactionManagerPort } from '@shared/domain/transaction-manager.port';
import { CaseNotFoundError } from '../../../domain/errors/case.errors';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { CaseDeactivation, CaseDeactivationInput } from '../../../domain/value-objects/case/case-deactivation.vo';

export interface DeactivateCaseCommand {
  caseId: number;
  /** What the form sends; the whole body is optional (CA-21.2). */
  input: CaseDeactivationInput;
  /** Who gives it de baja, for the record and the audit (CA-21.3). Any profile may (V5 §3.7). */
  actor: AuthenticatedUser;
}

/**
 * HU21 — gives a case de baja (contract V5, `DELETE /cases/{caseId}`).
 *
 * Coordinates and decides nothing: what a valid baja is belongs to
 * {@link CaseDeactivation} and {@link Case.deactivate}. The case exists (404) →
 * the reason (400) → the baja and its audit record, in one transaction.
 *
 * Nothing is announced: the Drive folder is not deleted, moved or renamed
 * (CA-21.8, RN9). Everything else the baja turns off — listings, subresources,
 * counts, dashboards, the daily process — already reads only active cases.
 */
@Injectable()
export class DeactivateCase {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(AUDIT_TRAIL) private readonly auditTrail: AuditTrailPort,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManagerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /**
   * @throws {CaseNotFoundError} 404, also for a case already given de baja,
   *   even if another request gave it de baja a moment ago (CA-21.5).
   * @throws {ValidationError} 400, a reason longer than 500 characters (CA-21.2).
   */
  async execute(command: DeactivateCaseCommand): Promise<void> {
    const target = await this.cases.findById(command.caseId);
    if (!target || !target.active) {
      throw new CaseNotFoundError();
    }

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
  }
}
