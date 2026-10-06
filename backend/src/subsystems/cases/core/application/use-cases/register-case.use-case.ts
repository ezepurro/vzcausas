import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { ValidationError } from '@shared/domain/domain-error';
import { CaseSacAlreadyExistsError } from '../../domain/errors/case.errors';
import { CriminalCase } from '../../domain/entities/criminal';
import { CaseFactory } from '../../domain/factories/case.factory';
import { CASE_REPOSITORY, CaseRepository } from '../../domain/ports/case.repository';
import { CLIENT_LOOKUP, ClientLookupPort } from '../../domain/ports/client-lookup.port';
import { CURRENT_DATE, CurrentDatePort } from '../../domain/ports/current-date.port';
import { LAWYER_LOOKUP, LawyerLookupPort } from '../../domain/ports/lawyer-lookup.port';
import { PROC_STATE_LOOKUP, ProcStateLookupPort } from '../../domain/ports/proc-state-lookup.port';
import {
  LEGAL_QUALIFICATION_LOOKUP,
  LegalQualificationLookupPort,
} from '../../domain/ports/legal-qualification-lookup.port';
import { RegisterCaseCommand, RegisterCaseResult } from '../common/register-case.interfaces';

const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';

/** HU18: registers a new case in the initial state of its jurisdiction. */
@Injectable()
export class RegisterCase {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(CLIENT_LOOKUP) private readonly clients: ClientLookupPort,
    @Inject(LAWYER_LOOKUP) private readonly lawyers: LawyerLookupPort,
    @Inject(PROC_STATE_LOOKUP) private readonly procStates: ProcStateLookupPort,
    @Inject(LEGAL_QUALIFICATION_LOOKUP) private readonly qualifications: LegalQualificationLookupPort,
    @Inject(CURRENT_DATE) private readonly currentDate: CurrentDatePort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(command: RegisterCaseCommand): Promise<RegisterCaseResult> {
    const today = this.currentDate.today();
    const requested = command.legalQualifications ?? [];

    const [initialState, client, responsibleLawyer, foundQualifications] = await Promise.all([
      this.procStates.findInitialByJurisdiction(command.jurisdiction),
      this.clients.findActiveById(command.clientId),
      this.lawyers.findActiveById(command.responsibleLawyerId),
      this.qualifications.findActiveByIds(requested.map((item) => item.legalQualificationId)),
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
        instructorPhone: command.instructorPhone,
        instructorExtension: command.instructorExtension,
        counterparty: command.counterparty,
        subjectMatter: command.subjectMatter,
        clientId: command.clientId,
        proceduralRole: command.proceduralRole,
        legalQualifications: requested,
        legalQualificationRefs: foundQualifications,
        responsibleLawyerId: command.responsibleLawyerId,
        startDate: command.startDate ?? today,
        createdByUserId: command.createdByUserId,
        today,
        now: this.clock.now(),
      },
      referenceErrors,
    );

    if (newCase.sacNumber !== null && (await this.cases.existsBySacNumber(newCase.sacNumber))) {
      throw new CaseSacAlreadyExistsError();
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
