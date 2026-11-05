import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_TRAIL, AuditTrailPort } from '@shared/domain/audit-trail.port';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { TRANSACTION_MANAGER, TransactionManagerPort } from '@shared/domain/transaction-manager.port';
import { ProceduralActChanges } from '../../../domain/entities/procedural-act.entity';
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

  async execute(_command: UpdateProceduralActCommand): Promise<ProceduralActView> {
    throw new Error('Not implemented: UpdateProceduralAct.execute (HU28).');
  }
}
