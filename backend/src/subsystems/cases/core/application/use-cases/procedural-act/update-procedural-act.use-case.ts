import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_TRAIL, AuditTrailPort } from '@shared/domain/audit-trail.port';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { TRANSACTION_MANAGER, TransactionManagerPort } from '@shared/domain/transaction-manager.port';
import { ActModificationRefs, Case } from '../../../domain/entities/case/case.entity';
import { ProceduralAct, ProceduralActChanges } from '../../../domain/entities/procedural-act.entity';
import { CaseNotFoundError, ProceduralActNotFoundError } from '../../../domain/errors/case.errors';
import { Deadline } from '../../../domain/value-objects/deadline/deadline.vo';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { LEGAL_PARAMETERS_LOOKUP, LegalParametersLookupPort } from '../../../domain/ports/case/legal-parameters-lookup.port';
import { DEADLINE_CALCULATOR, DeadlineCalculatorPort } from '../../../domain/ports/procedural-act/deadline-calculator.port';
import {
  PROCEDURAL_ACT_REPOSITORY,
  ProceduralActRepository,
  ProceduralActView,
} from '../../../domain/ports/procedural-act/procedural-act.repository';
import { GetProceduralAct } from './get-procedural-act.use-case';

export interface UpdateProceduralActCommand {
  caseId: number;
  actId: number;
  changes: ProceduralActChanges;
  // Only the current responsible lawyer of the case may (CA-28.2).
  actor: AuthenticatedUser;
}

/**
 * HU28 — corrects a procedural act (contract V5,
 * `PATCH /cases/{caseId}/procedural-acts/{actId}`).
 *
 * Coordinates and decides nothing: the rules are `ProceduralAct`'s and `Case`'s.
 * Order of the checks, so a rejected request writes nothing: the case exists and
 * is in force (404) → the user is its current lawyer (403) → the act is of the
 * case (404) → the case is not prescribed (422) → the data (400).
 */
@Injectable()
export class UpdateProceduralAct {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(PROCEDURAL_ACT_REPOSITORY) private readonly acts: ProceduralActRepository,
    @Inject(LEGAL_PARAMETERS_LOOKUP) private readonly legalParameters: LegalParametersLookupPort,
    @Inject(DEADLINE_CALCULATOR) private readonly calculator: DeadlineCalculatorPort,
    @Inject(AUDIT_TRAIL) private readonly auditTrail: AuditTrailPort,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManagerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly getProceduralAct: GetProceduralAct,
  ) {}

  /**
   * @returns the act as `GET /cases/{caseId}/procedural-acts/{actId}` shows it:
   *   the response is built by {@link GetProceduralAct}, not rebuilt here.
   * @throws {CaseNotFoundError} 404, also for a case given de baja (CA-28.11, D-97).
   * @throws {NotResponsibleLawyerError} 403 (CA-28.2).
   * @throws {ProceduralActNotFoundError} 404, also for an act of another case (CA-28.11).
   * @throws {CaseInTerminalStateError} 422, a prescribed case (CA-28.9).
   * @throws {ValidationError} 400 (CA-28.3, CA-28.6).
   */
  async execute(command: UpdateProceduralActCommand): Promise<ProceduralActView> {
    const { caseId, actId, actor } = command;
    const target = await this.cases.findById(caseId);
    if (!target || !target.active) {
      throw new CaseNotFoundError();
    }
    target.assertCanModifyActs(actor);
    const found = await this.acts.findInCase(caseId, actId);
    if (!found) {
      throw new ProceduralActNotFoundError();
    }
    target.assertActsCanBeModified();

    const plan = target.planActModification(
      found.act,
      command.changes,
      await this.lookUpStates(target, found.act, command.changes),
      this.clock.today(),
    );
    // Nothing really changed: no write, no trace, no audit (decision of 05/11/2026).
    if (plan.changedFields.length === 0) {
      return this.getProceduralAct.execute({ caseId, actId });
    }

    const { term } = plan;
    const computedDueDate =
      term.timeLimitDays > 0 ? await this.calculator.computeDueDate(term.countsFrom, term.timeLimitDays, term.dayType) : null;
    const now = this.clock.now();
    const modified = found.act.modify({
      proceduralStateId: plan.proceduralStateId,
      customState: plan.customState,
      actDate: plan.actDate,
      notificationDate: plan.notificationDate,
      notes: plan.notes,
      deadline: Deadline.create({ ...term, computedDueDate, manualDueDate: plan.manualDueDate }),
      modifiedByUserId: actor.userId,
      now,
    });

    // D-99: which act governs the case now, the modified one or the most recent of the others.
    const latestOther = await this.acts.findLatestInCaseExcept(caseId, actId);
    const latestOtherState =
      latestOther?.proceduralStateId != null ? await this.legalParameters.findProcStateById(latestOther.proceduralStateId) : null;
    target.recalculateCurrentAct({
      modified,
      modifiedTerminal: plan.terminal,
      latestOther,
      latestOtherTerminal: latestOtherState?.terminal ?? false,
      now,
    });

    // The act first; the case may point to it. Everything lands together, with its audit record, or nothing does.
    await this.transactions.runInTransaction(async () => {
      await this.acts.saveModification(modified);
      await this.cases.saveCurrentAct(target);
      await this.auditTrail.record({
        actorUserId: actor.userId,
        action: 'procedural-act.updated',
        entityType: 'ProceduralAct',
        entityId: String(actId),
        occurredAt: now,
        // The names of the fields, never their values (audit §4).
        metadata: { caseId, changedFields: [...plan.changedFields] },
      });
    });

    return this.getProceduralAct.execute({ caseId, actId });
  }

  /**
   * What the case cannot find out on its own: the table row of the state the act
   * would end up in (the one sent, or its current one) and whether a hand-written
   * state sent repeats one of the table. Only what is needed is looked up.
   */
  private async lookUpStates(target: Case, act: ProceduralAct, changes: ProceduralActChanges): Promise<ActModificationRefs> {
    const sentStateId = typeof changes.proceduralStateId === 'number' ? changes.proceduralStateId : null;
    const sentCustomState = typeof changes.customState === 'string' ? changes.customState.trim() : '';
    const stateId = sentStateId ?? (sentCustomState ? null : act.proceduralStateId);

    const state = stateId === null ? null : await this.legalParameters.findProcStateById(stateId);
    const customStateNamesTableState =
      sentCustomState !== '' && sentStateId === null && sentCustomState !== act.customState
        ? await this.legalParameters.existsProcStateActiveByName(target.jurisdictionId, sentCustomState)
        : false;
    return { state, customStateNamesTableState };
  }
}
