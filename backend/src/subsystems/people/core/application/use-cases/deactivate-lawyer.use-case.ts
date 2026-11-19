import { Inject, Injectable } from "@nestjs/common";
import { AUDIT_TRAIL, AuditTrailPort } from "@shared/domain/audit-trail.port";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import { TRANSACTION_MANAGER, TransactionManagerPort } from "@shared/domain/transaction-manager.port";
import { EventPublisher } from "@shared/infrastructure/events/event-publisher.port";
import { createEventHeader } from "@shared/infrastructure/events/integration-event";
import { LawyerHasDependenciesError, LawyerNotFoundError } from "../../domain/errors/people.errors";
import { LAWYER_DEACTIVATED, LawyerDeactivatedEvent } from "../../domain/ports/events/lawyer-deactivated.event";
import { LawyerCasesPort } from "../../domain/ports/lawyer-cases.port";
import { LAWYER_REPOSITORY, LawyerRepository } from "../../domain/ports/lawyer.repository";
import { LawyerUserPort } from "../../domain/ports/lawyer-user.port";
import { CaseReassignmentPlan } from "../../domain/value-objects/case-reassignment-plan.vo";

export type DeactivateLawyerCommand = {
  lawyerId: number;
  /**
   * What the form sends under `reassignments`, as it came: it is checked by
   * {@link CaseReassignmentPlan}, not by the transport, so every problem of the distribution
   * is answered with the contract's `details.reassignments`.
   */
  reassignments?: unknown;
  /** The administrator who gives the lawyer de baja, for the audit records. */
  actorUserId: number;
};

/**
 * HU15 — gives a lawyer de baja and, in the same operation, hands their active cases to other
 * lawyers or leaves them "Sin asignar" (contract V6, `DELETE /lawyers/{lawyerId}`, D-143).
 *
 * Coordinates and decides nothing: what a valid distribution is belongs to
 * {@link CaseReassignmentPlan}; which cases are active and what handing one over means belongs
 * to `cases`, asked through {@link LawyerCasesPort}; what losing the lawyer profile means for the
 * linked user belongs to `identity`, asked through {@link LawyerUserPort} (D-133).
 *
 * Order of the checks, so a rejected request writes nothing: the lawyer exists (404) → the
 * distribution is valid for their cases and the target lawyers (400) → it covers every active
 * case (409). The cases, the baja of the lawyer, the user and the audit record are written in
 * **one transaction**: all or nothing.
 *
 * After the commit, and never failing the baja (D-60): the folders of the reassigned cases
 * follow them, and `LawyerDeactivated` tells `documents` about the lawyer's own folder (D-132).
 *
 * Known gap: a case assigned to this lawyer between the read of their cases and the commit is
 * caught by the check inside the transaction, which fails with the 409 and undoes everything,
 * but a case assigned at the very instant of the commit is not. Closing that would need a lock
 * across two subsystems.
 */
@Injectable()
export class DeactivateLawyerUseCase {
  constructor(
    @Inject(LAWYER_REPOSITORY) private readonly lawyers: LawyerRepository,
    @Inject(LawyerCasesPort) private readonly cases: LawyerCasesPort,
    @Inject(LawyerUserPort) private readonly users: LawyerUserPort,
    @Inject(AUDIT_TRAIL) private readonly auditTrail: AuditTrailPort,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManagerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly events: EventPublisher,
  ) {}

  /**
   * @throws {LawyerNotFoundError} 404, also for a lawyer already given de baja, even if another
   *   request gave it de baja a moment ago.
   * @throws {InvalidReassignmentsError} 400, `details.reassignments`.
   * @throws {LawyerHasDependenciesError} 409, an active case left out of the distribution.
   */
  async execute(command: DeactivateLawyerCommand): Promise<void> {
    const lawyer = await this.lawyers.findById(command.lawyerId);
    // A lawyer given de baja does not exist for the client (RN12, §3.3).
    if (!lawyer || !lawyer.isActive()) {
      throw new LawyerNotFoundError(command.lawyerId);
    }

    const plan = CaseReassignmentPlan.parse(command.reassignments);
    const activeCaseIds = await this.cases.findActiveCaseIdsOf(lawyer.id);
    plan.assertApplicableTo({
      lawyerId: lawyer.id,
      activeCaseIds,
      activeTargetLawyerIds: await this.activeLawyerIdsAmong(plan.targetLawyerIds),
    });
    plan.assertCovers(activeCaseIds);

    const now = this.clock.now();
    lawyer.deactivate();

    let keepsHistory = false;
    await this.transactions.runInTransaction(async () => {
      await this.cases.reassign({
        fromLawyerId: lawyer.id,
        reassignments: plan.reassignments,
        actorUserId: command.actorUserId,
      });
      // A case assigned to the lawyer after their cases were read would be left with a lawyer
      // that no longer exists: it is the same 409, and the whole operation is undone.
      if ((await this.cases.findActiveCaseIdsOf(lawyer.id)).length > 0) {
        throw new LawyerHasDependenciesError();
      }
      // What is left in force is the lawyer's history (cases in a terminal state): their folder stays (D-132).
      keepsHistory = (await this.cases.countCasesInForceOf(lawyer.id)) > 0;
      if (!(await this.lawyers.saveDeactivation(lawyer))) {
        throw new LawyerNotFoundError(lawyer.id);
      }
      await this.users.unlinkLawyer(lawyer.id);
      await this.auditTrail.record({
        actorUserId: command.actorUserId,
        action: "lawyer.deactivated",
        entityType: "Lawyer",
        entityId: String(lawyer.id),
        occurredAt: now,
      });
    });

    await this.cases.announceFolderMoves(plan.caseIds);
    await this.announceDeactivation(lawyer.id, keepsHistory, now);
  }

  /** Of these ids, the lawyers that exist and are active: one query, never one per target. */
  private async activeLawyerIdsAmong(lawyerIds: readonly number[]): Promise<ReadonlySet<number>> {
    if (lawyerIds.length === 0) {
      return new Set();
    }
    const found = await this.lawyers.findByIds(lawyerIds);
    return new Set(found.filter((lawyer) => lawyer.isActive()).map((lawyer) => lawyer.id));
  }

  private async announceDeactivation(lawyerId: number, keepsHistory: boolean, occurredAt: Date): Promise<void> {
    const event: LawyerDeactivatedEvent = {
      ...createEventHeader(LAWYER_DEACTIVATED, occurredAt),
      lawyerId,
      keepsHistory,
    };
    await this.events.publish(event);
  }
}
