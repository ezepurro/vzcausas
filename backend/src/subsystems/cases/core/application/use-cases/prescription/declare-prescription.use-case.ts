import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CaseInTerminalStateError, CaseNotFoundError } from '../../../domain/errors/case.errors';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { CaseListItem } from '../../../domain/ports/case/case.repository';
import { LEGAL_PARAMETERS_LOOKUP, LegalParametersLookupPort } from '../../../domain/ports/case/legal-parameters-lookup.port';
import {
  PrescriptionDeclaration,
  PrescriptionDeclarationInput,
} from '../../../domain/value-objects/prescription/prescription-declaration.vo';
import { GetCase } from '../case/get-case.use-case';

export interface DeclarePrescriptionCommand extends PrescriptionDeclarationInput {
  caseId: number;
  // Who marks it: an administrator or any lawyer (CA-33.1).
  actor: AuthenticatedUser;
}

/**
 * HU33 — marks a criminal case as prescribed (`POST /cases/{caseId}/prescription`,
 * contract V4 §3.7, D-52 to D-54).
 *
 * It coordinates and does not decide:
 * - who may do it is {@link PrescriptionDeclaration}'s rule, asked first
 *   because it does not depend on the case;
 * - whether this case can prescribe, and what changes in it, is the case's own
 *   rule (`Case.declarePrescription`, overridden by `CriminalCase`). Here there
 *   is no `if` on the jurisdiction.
 *
 * Order (the business before the data, as in HU31): 403 → 404 → 422 → 400.
 * A refused request writes nothing.
 *
 * One conditional `UPDATE` is the whole write, so it needs no transaction. The
 * answer is the case as `GET /cases/{caseId}` shows it (D-54): it is read back
 * through {@link GetCase} rather than built here, so the two cannot differ.
 */
@Injectable()
export class DeclarePrescription {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(LEGAL_PARAMETERS_LOOKUP) private readonly legalParameters: LegalParametersLookupPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly getCase: GetCase,
  ) {}

  async execute(command: DeclarePrescriptionCommand): Promise<CaseListItem> {
    PrescriptionDeclaration.assertCanBeDeclaredBy(command.actor);

    // `findById` does not filter by `active`: a case given de baja does not exist here (§4, Bajas).
    const targetCase = await this.cases.findById(command.caseId);
    if (!targetCase || !targetCase.active) {
      throw new CaseNotFoundError();
    }

    const prescribedState = await this.legalParameters.findPrescribedProcStateByJurisdiction(
      targetCase.jurisdictionCode,
    );

    targetCase.declarePrescription({
      data: command,
      prescribedState,
      actor: command.actor,
      today: this.clock.today(),
      now: this.clock.now(),
    });

    // Another marking of the same case won between our read and this write.
    if (!(await this.cases.saveDeclaredPrescription(targetCase))) {
      throw new CaseInTerminalStateError(CaseInTerminalStateError.FOR_THIS_OPERATION);
    }

    return this.getCase.execute({ id: targetCase.id });
  }
}
