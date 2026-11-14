import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_TRAIL, AuditTrailPort } from '@shared/domain/audit-trail.port';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { Deactivation, DeactivationInput } from '@shared/domain/deactivation.vo';
import { TRANSACTION_MANAGER, TransactionManagerPort } from '@shared/domain/transaction-manager.port';
import { CaseNotFoundError, ProceduralActNotFoundError } from '../../../domain/errors/case.errors';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { LEGAL_PARAMETERS_LOOKUP, LegalParametersLookupPort } from '../../../domain/ports/case/legal-parameters-lookup.port';
import {
  PROCEDURAL_ACT_REPOSITORY,
  ProceduralActRepository,
} from '../../../domain/ports/procedural-act/procedural-act.repository';

export interface DeactivateProceduralActCommand {
  caseId: number;
  actId: number;
  /** What the form sends; the whole body is optional (CA-29.10). */
  input: DeactivationInput;
  // Only the current responsible lawyer of the case may (CA-29.7).
  actor: AuthenticatedUser;
}

/**
 * HU29 — gives a procedural act de baja (contract V6 §3.8,
 * `DELETE /cases/{caseId}/procedural-acts/{actId}`; D-124). The contract calls
 * it "anular". The baja is logical (RN12): the act is kept, and for the client
 * it no longer exists.
 *
 * Coordinates and decides nothing: who may and what the case's state becomes
 * are `Case`'s rules, the reason is {@link Deactivation}'s. Order of the checks,
 * as the contract fixes it (`:7001`, "Primero 404, después 403"), so a rejected
 * request writes nothing: the case exists and is in force (404) → the act is of
 * the case and in force (404) → the user is its responsible lawyer (403) → the
 * case is not prescribed (422) → the reason (400).
 */
@Injectable()
export class DeactivateProceduralAct {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(PROCEDURAL_ACT_REPOSITORY) private readonly acts: ProceduralActRepository,
    @Inject(LEGAL_PARAMETERS_LOOKUP) private readonly legalParameters: LegalParametersLookupPort,
    @Inject(AUDIT_TRAIL) private readonly auditTrail: AuditTrailPort,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManagerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /**
   * @throws {CaseNotFoundError} 404, also for a case given de baja (CA-29.9, D-97).
   * @throws {ProceduralActNotFoundError} 404: an act that does not exist, was
   *   already given de baja (even a moment ago, by another request) or is of
   *   another case (CA-29.9).
   * @throws {NotResponsibleLawyerError} 403 (CA-29.7).
   * @throws {CaseInTerminalStateError} 422, a prescribed case (CA-29.8).
   * @throws {ValidationError} 400, a reason longer than 500 characters (CA-29.10).
   */
  async execute(command: DeactivateProceduralActCommand): Promise<void> {
    const { caseId, actId, actor } = command;

    const target = await this.cases.findById(caseId);
    if (!target) {
      throw new CaseNotFoundError();
    }
    target.assertInForce();

    const view = await this.acts.findInCase(caseId, actId);
    if (!view) {
      throw new ProceduralActNotFoundError();
    }

    target.assertCanDeactivateActs(actor);
    target.assertActsCanBeDeactivated();

    const now = this.clock.now();
    const deactivation = Deactivation.create(command.input, { deactivatedByUserId: actor.userId, deactivatedAt: now });

    // D-14: which act governs the case without this one, or the initial state if none is left.
    const latestRemaining = await this.acts.findLatestInCaseExcept(caseId, actId);
    const latestRemainingState =
      latestRemaining?.proceduralStateId != null
        ? await this.legalParameters.findProcStateById(latestRemaining.proceduralStateId)
        : null;
    target.deactivateProceduralAct({
      deactivated: view.act,
      latestRemaining,
      latestRemainingTerminal: latestRemainingState?.terminal ?? false,
      initialState: await this.legalParameters.findInitialProcStateByJurisdiction(target.jurisdictionCode),
      now,
    });

    // The act first, then the case that may stop pointing to it; with its audit record, or nothing.
    await this.transactions.runInTransaction(async () => {
      if (!(await this.acts.saveDeactivation(caseId, actId, deactivation))) {
        throw new ProceduralActNotFoundError();
      }
      await this.cases.saveCurrentAct(target);
      // The reason stays in the act: it is free text (audit §4), as with cases (HU21) and clients (HU11).
      await this.auditTrail.record({
        actorUserId: actor.userId,
        action: 'procedural-act.deactivated',
        entityType: 'ProceduralAct',
        entityId: String(actId),
        occurredAt: now,
        metadata: { caseId },
      });
    });
  }
}
