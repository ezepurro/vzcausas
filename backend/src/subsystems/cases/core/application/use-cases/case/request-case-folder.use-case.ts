import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { EventPublisher } from '@shared/infrastructure/events/event-publisher.port';
import { createEventHeader } from '@shared/infrastructure/events/integration-event';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CaseNotFoundError, NotResponsibleLawyerError } from '../../../domain/errors/case.errors';
import {
  CASE_FOLDER_OUTCOMES,
  CaseFolderOutcome,
  CaseFolderOutcomePort,
} from '../../../domain/ports/case/case-folder-outcome.port';
import {
  CASE_FOLDER_STATE,
  CaseFolderStatePort,
  CaseFolderView,
} from '../../../domain/ports/case/case-folder-state.port';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { CASE_REGISTERED, CaseRegisteredEvent } from '../../../domain/ports/events/case-registered.event';
import {
  CASE_TEMPLATES_COPY_REQUESTED,
  CaseTemplatesCopyRequestedEvent,
} from '../../../domain/ports/events/case-templates-copy-requested.event';
import { PEOPLE_LOOKUP, PeopleLookupPort } from '../../../domain/ports/case/people-lookup.port';
import { JURISDICTION_FOLDER_LABEL } from '../../../domain/value-objects/case/jurisdiction-folder-label';

export interface RequestCaseFolderCommand {
  caseId: number;
  /**
   * Who asks, when it is the retry endpoint: only who operates the case may (D-110).
   * `RegisterCase` leaves it out: whoever registers a case has just created it.
   */
  actor?: AuthenticatedUser;
  /**
   * Also copy the formal templates of the jurisdiction into the folder (HU40).
   * Defaults to `true`, like the contract's `copyTemplates` of the retry endpoint.
   */
  copyTemplates?: boolean;
}

export interface RequestCaseFolderResult {
  /** The folder as it is after waiting; `null` for a case registered before the folders existed. */
  folder: CaseFolderView | null;
  /**
   * How the wait ended: the folder `CREATED`, an `ERROR`, or `TIMEOUT` (still being
   * created). `NOT_REQUESTED` when a request was already in flight or the folder
   * already existed, so nothing new was asked.
   */
  outcome: CaseFolderOutcome | 'NOT_REQUESTED';
}

/**
 * Asks for the cloud folder of a case and waits, up to a limit, for the answer
 * (HU39). **The only place that does it**: registering a case (`RegisterCase`)
 * and the retry endpoint (`POST /cases/{caseId}/folder`) both call this use
 * case instead of repeating the steps.
 *
 * 1. **Gate.** The case moves to `CREATING` in one atomic step; if it was
 *    already `CREATING` or `CREATED`, nothing is asked. That is what stops a
 *    case from getting two folders when two requests arrive at once.
 * 2. **Wait.** It registers the wait *before* publishing, or a fast answer
 *    could be missed.
 * 3. **Ask.** It publishes `CaseRegistered` for `documents` to create the
 *    folder. No transaction is open here: the case was saved before.
 * 4. **Answer.** `CaseFolderOutcomeListener` stores the result in the case and
 *    wakes the wait; this use case then reads the folder as it ended up.
 *
 * **Templates (HU40).** This use case does not copy them: it only *asks*.
 * `CaseRegistered.copyTemplates` tells `documents` to copy after creating the
 * folder, and the wait then lasts until the copy ends so the folder it returns
 * says how many were copied. When the folder already exists but some copy is
 * pending (CA-40.7), the gate refuses a new folder request and this publishes
 * `CaseTemplatesCopyRequested` instead; `documents` copies only what is missing.
 *
 * If the answer takes longer than the limit, the folder is returned as
 * `CREATING` and the creation goes on in the background.
 */
@Injectable()
export class RequestCaseFolder {
  private readonly logger = new Logger(RequestCaseFolder.name);

  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(PEOPLE_LOOKUP) private readonly people: PeopleLookupPort,
    @Inject(CASE_FOLDER_STATE) private readonly folderState: CaseFolderStatePort,
    @Inject(CASE_FOLDER_OUTCOMES) private readonly outcomes: CaseFolderOutcomePort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly events: EventPublisher,
  ) {}

  /**
   * @throws {CaseNotFoundError} if the case does not exist or was given de baja.
   * @throws {NotResponsibleLawyerError} 403, a lawyer who is not the responsible one (D-110).
   */
  async execute(command: RequestCaseFolderCommand): Promise<RequestCaseFolderResult> {
    const { caseId } = command;

    const found = await this.cases.findById(caseId);
    if (!found || !found.active) {
      throw new CaseNotFoundError();
    }
    if (command.actor) {
      found.assertCanBeOperatedBy(command.actor, NotResponsibleLawyerError.FOR_OPERATING_FOLDER);
    }
    // The lawyer may have been deactivated since the case was registered: the case keeps
    // showing them (RN12), so the folder is still named after them. Only a lawyer that
    // does not exist at all would be a broken reference, which the foreign key rules out.
    const lawyer = await this.people.findLawyerById(found.responsibleLawyerId);
    if (!lawyer) {
      throw new Error(`The lawyer ${found.responsibleLawyerId} of case ${caseId} does not exist.`);
    }

    const copyTemplates = command.copyTemplates ?? true;

    if (!(await this.folderState.startCreating(caseId))) {
      const folder = await this.folderState.find(caseId);
      if (copyTemplates && folder?.status === 'CREATED' && folder.templatesPending > 0) {
        return this.retryTemplates(caseId, folder);
      }
      return { folder, outcome: 'NOT_REQUESTED' };
    }

    const waiting = this.outcomes.expect(caseId, { untilTemplates: copyTemplates });
    const event: CaseRegisteredEvent = {
      ...createEventHeader(CASE_REGISTERED, this.clock.now()),
      caseId,
      caption: found.caption,
      lawyer: { id: lawyer.id, lastName: lawyer.lastName, firstName: lawyer.firstName },
      jurisdiction: {
        id: found.jurisdictionId,
        label: JURISDICTION_FOLDER_LABEL[found.jurisdictionCode],
      },
      copyTemplates,
    };

    try {
      await this.events.publish(event);
    } catch (error) {
      // Nobody will answer: do not leave the case waiting in CREATING.
      this.logger.error(`Could not publish ${event.type} (eventId=${event.eventId}, caseId=${caseId}): ${String(error)}`);
      await this.folderState.markFailed(caseId);
      this.outcomes.notify(caseId, 'ERROR');
    }

    const outcome = await waiting;
    if (outcome === 'TIMEOUT') {
      this.logger.warn(`The folder of case ${caseId} is still being created after the wait limit (eventId=${event.eventId})`);
    }
    return { folder: await this.folderState.find(caseId), outcome };
  }

  /**
   * The folder exists and some templates are still pending: asks `documents`
   * to copy those (CA-40.7) and waits for the copy to end. Registers the wait
   * before publishing, like the folder request.
   */
  private async retryTemplates(caseId: number, current: CaseFolderView): Promise<RequestCaseFolderResult> {
    const waiting = this.outcomes.expect(caseId, { untilTemplates: true });
    const event: CaseTemplatesCopyRequestedEvent = {
      ...createEventHeader(CASE_TEMPLATES_COPY_REQUESTED, this.clock.now()),
      caseId,
    };

    try {
      await this.events.publish(event);
    } catch (error) {
      // Nobody will answer: release the wait. The folder stays as it was, with its pending templates.
      this.logger.error(`Could not publish ${event.type} (eventId=${event.eventId}, caseId=${caseId}): ${String(error)}`);
      this.outcomes.notify(caseId, 'ERROR');
      await waiting;
      return { folder: current, outcome: 'ERROR' };
    }

    const outcome = await waiting;
    if (outcome === 'TIMEOUT') {
      this.logger.warn(`The templates of case ${caseId} are still being copied after the wait limit (eventId=${event.eventId})`);
    }
    return { folder: await this.folderState.find(caseId), outcome };
  }
}
