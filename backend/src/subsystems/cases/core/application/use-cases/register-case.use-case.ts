import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { ValidationError } from '@shared/domain/domain-error';
import { CaseSacAlreadyExistsError } from '../../domain/errors/case.errors';
import { CriminalCase } from '../../domain/entities/criminal';
import { CaseFactory } from '../../domain/factories/case.factory';
import { CASE_REPOSITORY, CaseRepository } from '../../domain/ports/case.repository';
import { LEGAL_PARAMETERS_LOOKUP, LegalParametersLookupPort } from '../../domain/ports/legal-parameters-lookup.port';
import { PEOPLE_LOOKUP, PeopleLookupPort } from '../../domain/ports/people-lookup.port';
import { RegisterCaseCommand, RegisterCaseResult } from '../common/register-case.interfaces';

const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';

/** HU18: registers a new case in the initial state of its jurisdiction. */
@Injectable()
export class RegisterCase {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(PEOPLE_LOOKUP) private readonly people: PeopleLookupPort,
    @Inject(LEGAL_PARAMETERS_LOOKUP) private readonly legalParameters: LegalParametersLookupPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(command: RegisterCaseCommand): Promise<RegisterCaseResult> {
    const today = this.clock.today();
    const requested = command.legalQualifications ?? [];

    const [initialState, client, responsibleLawyer, foundQualifications] = await Promise.all([
      this.legalParameters.findInitialProcStateByJurisdiction(command.jurisdiction),
      this.people.findActiveClientById(command.clientId),
      this.people.findActiveLawyerById(command.responsibleLawyerId),
      this.legalParameters.findActiveQualificationsByIds(requested.map((item) => item.legalQualificationId)),
    ]);

    // Unknown ids are data of the form that the user has to fix, so they
    // are reported as validation errors on their field (D-22).
    const referenceErrors: Record<string, string> = {};
    if (!client) {
      referenceErrors.clientId = 'No existe un cliente vigente con ese identificador.';
    }
    if (!responsibleLawyer) {
      referenceErrors.responsibleLawyerId = 'No existe un abogado vigente con ese identificador.';
    }
    const knownIds = new Set(foundQualifications.map((item) => item.id));
    if (requested.some((item) => !knownIds.has(item.legalQualificationId))) {
      referenceErrors.legalQualifications = 'Alguna calificación legal no existe o está dada de baja.';
    }
    if (!initialState) {
      referenceErrors.jurisdiction = 'No existe un fuero con estado inicial.';
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, referenceErrors);
    }

    const newCase = CaseFactory.create(
      {
        id: await this.cases.nextId(),
        jurisdictionCode: command.jurisdiction,
        initialState,
        sacNumber: command.sacNumber,
        caption: command.caption,
        court: command.court,
        instructorName: command.instructorName,
        tribunalPhone: command.tribunalPhone,
        instructorExtension: command.instructorExtension,
        counterparty: command.counterparty,
        subjectMatter: command.subjectMatter,
        clientId: command.clientId,
        proceduralRole: command.proceduralRole,
        legalQualifications: requested,
        legalQualificationRefs: foundQualifications,
        responsibleLawyerId: command.responsibleLawyerId,
        startDate: command.startDate,
        createdByUserId: command.createdByUserId,
        today,
        now: this.clock.now(),
      },
      referenceErrors,
    );

    if (newCase.sacNumber !== null && (await this.cases.existsBySacNumber(newCase.sacNumber))) {
      throw new CaseSacAlreadyExistsError();
    }

    // Every offense is saved with its prescription date: calculate the ones still pending.
    if (newCase instanceof CriminalCase) {
      for (const offense of newCase.offenses) {
        if (offense.prescriptionExpiresOn === null) {
          offense.calculatePrescription();
        }
      }
    }

    await this.cases.save(newCase);
    const currentState = await this.cases.findCurrentState(newCase.id);

    // The factory only returns when there were no reference errors, so the
    // client and the lawyer exist.
    return {
      newCase,
      client: client!,
      responsibleLawyer: responsibleLawyer!,
      offenses: newCase instanceof CriminalCase ? newCase.offenses : [],
      currentState,
    };
  }
}
