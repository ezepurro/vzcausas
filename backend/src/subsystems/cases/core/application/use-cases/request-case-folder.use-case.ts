import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { EventPublisher } from '@shared/infrastructure/events/event-publisher.port';
import { createEventHeader } from '@shared/infrastructure/events/integration-event';
import { CaseNotFoundError, CaseFolderLawyerUnavailableError } from '../../domain/errors/case.errors';
import {
  CASE_FOLDER_OUTCOMES,
  CASE_FOLDER_WAIT_MS,
  CaseFolderOutcome,
  CaseFolderOutcomePort,
} from '../../domain/ports/case-folder-outcome.port';
import {
  CASE_FOLDER_STATE,
  CaseFolderStatePort,
  CaseFolderView,
} from '../../domain/ports/case-folder-state.port';
import { CASE_REPOSITORY, CaseRepository } from '../../domain/ports/case.repository';
import { CASE_REGISTERED, CaseRegisteredEvent } from '../../domain/ports/events/case-registered.event';
import { PEOPLE_LOOKUP, PeopleLookupPort } from '../../domain/ports/people-lookup.port';
import { JURISDICTION_FOLDER_LABEL } from '../../domain/value-objects/jurisdiction-folder-label';

export interface RequestCaseFolderCommand {
  caseId: number;
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
    @Inject(CASE_FOLDER_WAIT_MS) private readonly waitMs: number,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly events: EventPublisher,
  ) {}

  /**
   * @throws {CaseNotFoundError} if the case does not exist or was given de baja.
   * @throws {CaseFolderLawyerUnavailableError} if the lawyer in charge is no longer active.
   */
  async execute(command: RequestCaseFolderCommand): Promise<RequestCaseFolderResult> {
    const { caseId } = command;

    const found = await this.cases.findById(caseId);
    if (!found || !found.active) {
      throw new CaseNotFoundError();
    }
    const lawyer = await this.people.findActiveLawyerById(found.responsibleLawyerId);
    if (!lawyer) {
      throw new CaseFolderLawyerUnavailableError();
    }

    if (!(await this.folderState.startCreating(caseId))) {
      return { folder: await this.folderState.find(caseId), outcome: 'NOT_REQUESTED' };
    }

    const waiting = this.outcomes.expect(caseId, this.waitMs);
    const event: CaseRegisteredEvent = {
      ...createEventHeader(CASE_REGISTERED, this.clock.now()),
      caseId,
      caption: found.caption,
      lawyer: { id: lawyer.id, lastName: lawyer.lastName, firstName: lawyer.firstName },
      jurisdiction: {
        id: found.jurisdictionId,
        label: JURISDICTION_FOLDER_LABEL[found.jurisdictionCode],
      },
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
      this.logger.warn(`The folder of case ${caseId} is still being created after ${this.waitMs} ms (eventId=${event.eventId})`);
    }
    return { folder: await this.folderState.find(caseId), outcome };
  }
}
