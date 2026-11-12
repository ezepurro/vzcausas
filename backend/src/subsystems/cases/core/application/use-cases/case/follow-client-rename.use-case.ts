import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUDIT_TRAIL, AuditTrailPort } from '@shared/domain/audit-trail.port';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { ClientCaptionName } from '../../../domain/value-objects/case/client-caption-name.vo';
import { CaseFolderAnnouncer } from './case-folder-announcer';

/** A client's name, as `people` sends it. */
export interface ClientNameInput {
  lastName: string;
  firstName: string;
}

export interface FollowClientRenameCommand {
  clientId: number;
  previous: ClientNameInput;
  next: ClientNameInput;
  /** Who renamed the client: each caption that changes is audited to them (CA-10.5). */
  actorUserId: number;
  occurredAt: Date;
}

/**
 * HU10 — the captions of a client's cases follow its new name (D-121, D-130,
 * CA-10.9), and then their Drive folders (CA-10.10).
 *
 * Coordinates and decides nothing: whether a caption changes is
 * {@link Case.followClientRename}. Two steps, around the caller's commit:
 *
 * - {@link execute} runs **inside** the transaction that saves the client: for
 *   each case in force of the client — any state, terminal ones included; the
 *   ones given de baja are not touched — it rewrites the caption and audits it
 *   as one more modification of the case (`case.updated`, `['caption']`).
 * - {@link announce} runs **after** the commit: it asks `documents` to rename
 *   the folder of each case whose caption changed. It never throws.
 */
@Injectable()
export class FollowClientRename {
  private readonly logger = new Logger(FollowClientRename.name);

  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(AUDIT_TRAIL) private readonly auditTrail: AuditTrailPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly folderAnnouncer: CaseFolderAnnouncer,
  ) {}

  /** @returns the ids of the cases whose caption changed. */
  async execute(command: FollowClientRenameCommand): Promise<number[]> {
    const previous = ClientCaptionName.of(command.previous.lastName, command.previous.firstName);
    const next = ClientCaptionName.of(command.next.lastName, command.next.firstName);

    const renamed: number[] = [];
    for (const target of await this.cases.findActiveByClientId(command.clientId)) {
      if (!target.followClientRename(previous, next, command.occurredAt)) {
        continue;
      }
      await this.cases.saveCaption(target);
      await this.auditTrail.record({
        actorUserId: command.actorUserId,
        action: 'case.updated',
        entityType: 'Case',
        entityId: String(target.id),
        occurredAt: command.occurredAt,
        metadata: { changedFields: ['caption'] },
      });
      renamed.push(target.id);
    }
    return renamed;
  }

  /** Asks for the folder of each renamed case to be renamed too (D-104). Never throws. */
  async announce(caseIds: readonly number[]): Promise<void> {
    const now = this.clock.now();
    for (const caseId of caseIds) {
      try {
        const target = await this.cases.findById(caseId);
        if (target) {
          await this.folderAnnouncer.announce(target, ['caption'], now);
        }
      } catch (error) {
        this.logger.error(`Could not announce the folder change of case ${caseId}: ${String(error)}`);
      }
    }
  }
}
