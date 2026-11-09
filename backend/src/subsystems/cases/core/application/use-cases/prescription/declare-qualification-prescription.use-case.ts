import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import {
  CaseNotFoundError,
  LegalQualificationAlreadyPrescribedError,
  NotResponsibleLawyerError,
} from '../../../domain/errors/case.errors';
import { CASE_REPOSITORY, CaseListItem, CaseRepository } from '../../../domain/ports/case/case.repository';
import { LEGAL_PARAMETERS_LOOKUP, LegalParametersLookupPort } from '../../../domain/ports/case/legal-parameters-lookup.port';
import { PrescriptionDeclarationInput } from '../../../domain/value-objects/prescription/prescription-declaration.vo';
import { GetCase } from '../case/get-case.use-case';

export interface DeclareQualificationPrescriptionCommand extends PrescriptionDeclarationInput {
  caseId: number;
  legalQualificationId: number;
  // Who declares it: an administrator or the responsible lawyer (CA-33.1, D-110).
  actor: AuthenticatedUser;
}

/**
 * D-113 — declares one legal qualification of a criminal case prescribed
 * (`POST /cases/{caseId}/legal-qualifications/{legalQualificationId}/prescription`,
 * HU33 revised).
 *
 * It coordinates and does not decide, like {@link DeclarePrescription}:
 * - who may do it is the case's rule (`Case.assertCanDeclarePrescriptionBy`,
 *   D-110), with this endpoint's own wording;
 * - whether the qualification can be declared, and whether that closes the
 *   case, is `Case.declareQualificationPrescription` (overridden by
 *   `CriminalCase`). Here there is no `if` on the jurisdiction.
 *
 * Order: 404 case → 403 → 422 jurisdiction → 404 qualification → 422 → 400. A
 * refused request writes nothing. The "Prescripta" state is looked up always:
 * the aggregate needs it only when the qualification is the last one pending.
 *
 * The answer is the case as `GET /cases/{caseId}` shows it, read back through
 * {@link GetCase}.
 */
@Injectable()
export class DeclareQualificationPrescription {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(LEGAL_PARAMETERS_LOOKUP) private readonly legalParameters: LegalParametersLookupPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly getCase: GetCase,
  ) {}

  async execute(command: DeclareQualificationPrescriptionCommand): Promise<CaseListItem> {
    // `findById` does not filter by `active`: a case given de baja does not exist here (§4, Bajas).
    const targetCase = await this.cases.findById(command.caseId);
    if (!targetCase || !targetCase.active) {
      throw new CaseNotFoundError();
    }
    targetCase.assertCanDeclarePrescriptionBy(
      command.actor,
      NotResponsibleLawyerError.FOR_DECLARING_QUALIFICATION_PRESCRIPTION,
    );

    const prescribedState = await this.legalParameters.findPrescribedProcStateByJurisdiction(
      targetCase.jurisdictionCode,
    );

    targetCase.declareQualificationPrescription({
      legalQualificationId: command.legalQualificationId,
      data: command,
      prescribedState,
      actor: command.actor,
      today: this.clock.today(),
      now: this.clock.now(),
    });

    // Another declaration of the same qualification won between our read and this write.
    if (!(await this.cases.saveDeclaredPrescription(targetCase, [command.legalQualificationId]))) {
      throw new LegalQualificationAlreadyPrescribedError();
    }

    return this.getCase.execute({ id: targetCase.id });
  }
}
