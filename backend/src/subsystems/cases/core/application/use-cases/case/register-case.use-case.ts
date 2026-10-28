import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { ValidationError } from '@shared/domain/domain-error';
import { CaseSacAlreadyExistsError, CopyTemplatesWithoutFolderError } from '../../../domain/errors/case.errors';
import { CaseFactory } from '../../../domain/factories/case.factory';
import { CASE_FOLDER_STATE, CaseFolderStatePort, CaseFolderView } from '../../../domain/ports/case/case-folder-state.port';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { LEGAL_PARAMETERS_LOOKUP, LegalParametersLookupPort } from '../../../domain/ports/case/legal-parameters-lookup.port';
import { PEOPLE_LOOKUP, PeopleLookupPort } from '../../../domain/ports/case/people-lookup.port';
import { Prescription } from '../../../domain/prescription';
import { RegisterCaseCommand, RegisterCaseResult } from './register-case.interfaces';
import { RequestCaseFolder } from './request-case-folder.use-case';

const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';

/**
 * HU18: registers a new case in the initial state of its jurisdiction.
 *
 * The cloud folder (HU39) is not made here: once the case is saved, this asks
 * {@link RequestCaseFolder}, the same use case the retry endpoint uses. The
 * registration **never fails because of the folder** (CA-39.5): if the folder
 * cannot be asked for, the case stays registered and the folder is left as it is.
 *
 * Copying the templates into it (HU40) is not done here either: `copyTemplates`
 * travels to {@link RequestCaseFolder}, which asks `documents` through the same
 * event, and the folder this returns says how many were copied.
 */
@Injectable()
export class RegisterCase {
  private readonly logger = new Logger(RegisterCase.name);

  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(PEOPLE_LOOKUP) private readonly people: PeopleLookupPort,
    @Inject(LEGAL_PARAMETERS_LOOKUP) private readonly legalParameters: LegalParametersLookupPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(CASE_FOLDER_STATE) private readonly folderState: CaseFolderStatePort,
    private readonly requestCaseFolder: RequestCaseFolder,
  ) {}

  async execute(command: RegisterCaseCommand): Promise<RegisterCaseResult> {
    const createFolder = command.createFolder ?? true;
    const copyTemplates = command.copyTemplates ?? createFolder;
    if (copyTemplates && !createFolder) {
      throw new CopyTemplatesWithoutFolderError();
    }

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
        clientDetained: command.clientDetained,
        injunctionGranted: command.injunctionGranted,
        harmfulActDate: command.harmfulActDate,
        harmfulActRenews: command.harmfulActRenews,
        harmfulActRenewalDays: command.harmfulActRenewalDays,
        harmfulActTermDays: command.harmfulActTermDays,
        harmfulActTermDayType: command.harmfulActTermDayType,
        administrativeRemedyExhaustedOn: command.administrativeRemedyExhaustedOn,
        courtFeePaid: command.courtFeePaid,
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
    const folder = createFolder
      ? await this.requestFolder(newCase.id, copyTemplates)
      : await this.currentFolder(newCase.id);

    const snapshot = newCase.toSnapshot();

    // The factory only returns when there were no reference errors, so the
    // client and the lawyer exist.
    return {
      newCase: snapshot,
      client: client!,
      responsibleLawyer: responsibleLawyer!,
      currentState,
      // A case that was just registered is in the initial state, so its term (if it has one) is open.
      harmfulActDeadline: newCase.harmfulActDeadline(today),
      // Same rule as the listing and the detail (`withDeadlines`). A case being
      // registered has no interruptive acts, so it counts from each offense date.
      prescription: Prescription.of(snapshot.jurisdictionCode, snapshot.offenses, null, today),
      folder,
    };
  }

  private async requestFolder(caseId: number, copyTemplates: boolean): Promise<CaseFolderView | null> {
    try {
      return (await this.requestCaseFolder.execute({ caseId, copyTemplates })).folder;
    } catch (error) {
      this.logger.error(`The folder of case ${caseId} could not be requested: ${String(error)}`);
      return this.currentFolder(caseId);
    }
  }

  private async currentFolder(caseId: number): Promise<CaseFolderView | null> {
    try {
      return await this.folderState.find(caseId);
    } catch (error) {
      this.logger.error(`The folder of case ${caseId} could not be read: ${String(error)}`);
      return null;
    }
  }
}
