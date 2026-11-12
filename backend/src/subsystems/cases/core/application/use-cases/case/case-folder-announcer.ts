import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@shared/infrastructure/events/event-publisher.port';
import { createEventHeader } from '@shared/infrastructure/events/integration-event';
import { Case } from '../../../domain/entities/case/case.entity';
import { CASE_FOLDER_STATE, CaseFolderStatePort } from '../../../domain/ports/case/case-folder-state.port';
import { PEOPLE_LOOKUP, PeopleLookupPort } from '../../../domain/ports/case/people-lookup.port';
import { CASE_MODIFIED, CaseModifiedEvent } from '../../../domain/ports/events/case-modified.event';
import { JURISDICTION_FOLDER_LABEL } from '../../../domain/value-objects/case/jurisdiction-folder-label';

/** What a change asks of the folder: `caption` renames it, `responsibleLawyer` moves it. */
export type FolderChange = 'caption' | 'responsibleLawyer';

/**
 * Tells `documents` that the folder of a case has to follow it (D-104): one
 * `CaseModified` per case, read by its `CaseModifiedListener`. Used by every
 * change that renames or moves a folder — modifying the case (HU19) and
 * renaming its client (HU10, CA-10.10) — so the rule is written once.
 *
 * Only a folder that exists (`CREATED`) can follow, and the case is already
 * saved when this runs: a failure here is logged and the folder is corrected
 * later. **It never throws** (CA-19.10, CA-10.10).
 */
@Injectable()
export class CaseFolderAnnouncer {
  private readonly logger = new Logger(CaseFolderAnnouncer.name);

  constructor(
    @Inject(CASE_FOLDER_STATE) private readonly folderState: CaseFolderStatePort,
    @Inject(PEOPLE_LOOKUP) private readonly people: PeopleLookupPort,
    private readonly events: EventPublisher,
  ) {}

  async announce(target: Case, changed: readonly FolderChange[], occurredAt: Date): Promise<void> {
    if (changed.length === 0) {
      return;
    }
    try {
      const folder = await this.folderState.find(target.id);
      if (folder?.status !== 'CREATED') {
        return;
      }
      // A lawyer given de baja keeps their folder: look them up active or not.
      const lawyer = await this.people.findLawyerById(target.responsibleLawyerId);
      if (!lawyer) {
        throw new Error(`The lawyer ${target.responsibleLawyerId} of case ${target.id} does not exist.`);
      }
      const event: CaseModifiedEvent = {
        ...createEventHeader(CASE_MODIFIED, occurredAt),
        caseId: target.id,
        caption: target.caption,
        lawyer: { id: lawyer.id, lastName: lawyer.lastName, firstName: lawyer.firstName },
        jurisdiction: { id: target.jurisdictionId, label: JURISDICTION_FOLDER_LABEL[target.jurisdictionCode] },
        changed: [...changed],
      };
      await this.events.publish(event);
    } catch (error) {
      this.logger.error(`Could not announce the folder change of case ${target.id}: ${String(error)}`);
    }
  }
}
