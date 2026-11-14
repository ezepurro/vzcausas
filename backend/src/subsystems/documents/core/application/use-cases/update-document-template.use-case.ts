import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { DocumentTemplate, TemplateFileInput } from '../../domain/entities/document-template.entity';
import {
  DocumentTemplateAlreadyExistsError,
  DocumentTemplateNotFoundError,
} from '../../domain/errors/documents.errors';
import {
  DOCUMENT_TEMPLATE_REPOSITORY,
  DocumentTemplateRepository,
  DocumentTemplateView,
  TemplateFilePlacement,
  TemplateForModification,
} from '../../domain/ports/document-template.repository';
import { TemplateStoredFiles } from '../../domain/value-objects/template-stored-files.vo';
import { KeyedMutex } from '../common/keyed-mutex';
import { RecycleBin } from '../common/recycle-bin';
import { TemplateCloudFiles } from '../common/template-cloud-files';

export interface UpdateDocumentTemplateCommand {
  actor: AuthenticatedUser;
  templateId: number;
  /** Everything below is optional: what is left out stays as it is (CA-36.1). */
  name?: string | null;
  jurisdictions?: readonly string[] | null;
  copyToNewCases?: boolean | null;
  file?: (TemplateFileInput & { content: Buffer }) | null;
}

/**
 * HU36: modifies a formal template (contract V6 §3.10, `PATCH /document-templates/{templateId}`):
 * its name, its jurisdictions, whether it is copied to new cases and, if needed,
 * its file.
 *
 * **What is essential and what is not** (D-125, CA-36.8). Putting the new file
 * in the folder of each jurisdiction, or a copy in a jurisdiction that is added,
 * is part of the operation: if the storage fails, the template does not change,
 * the answer is a 502, and the files already created are deleted again.
 * Moving what is no longer referenced to the `Papelera` is **not**: if it fails
 * the modification stands and the daily process moves the files later. They are
 * recorded in `template_files_pending_trash` **in the same write** as the
 * modification, so they are not lost if the process dies in between.
 *
 * **What goes to the `Papelera`** is the files the template referenced before
 * and does not reference after: the replaced file with all its copies in the
 * jurisdiction folders, the copy of a jurisdiction that is removed, and the loose
 * file of a template older than the subfolders, which is migrated by any change
 * of file or jurisdictions (every jurisdiction of the result gets its own copy).
 *
 * Nothing in the cases changes (CA-36.7): the copies already in a case folder are
 * not touched and `usageCount` stays. From now on new cases get the template
 * according to its current jurisdictions, `copyToNewCases` and file (HU40).
 *
 * One modification of the same template at a time in this process. A baja (HU37)
 * in between is caught by the conditional write, which writes nothing: 404.
 *
 * Coordinates and decides nothing: who may do it is
 * {@link DocumentTemplate.assertCanBeManagedBy}, and what is valid and what
 * changed is {@link DocumentTemplate.modify}. A rejected request writes and
 * uploads nothing.
 */
@Injectable()
export class UpdateDocumentTemplate {
  private readonly logger = new Logger(UpdateDocumentTemplate.name);
  private readonly locks = new KeyedMutex();

  constructor(
    @Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly cloudFiles: TemplateCloudFiles,
    private readonly bin: RecycleBin,
  ) {}

  /**
   * @throws {ForbiddenActionError} 403 `FORBIDDEN` (CA-36.9), before the template is looked for.
   * @throws {DocumentTemplateNotFoundError} 404, if it does not exist or is de baja (CA-36.10).
   * @throws {ValidationError} 400, with every invalid field, or under `body` if none was sent (CA-36.1).
   * @throws {DocumentTemplateAlreadyExistsError} 409, another active template has that name (CA-36.3).
   * @throws {DocumentStorageUnavailableError} 502: the new file or a copy could not be stored (CA-36.8).
   */
  async execute(command: UpdateDocumentTemplateCommand): Promise<DocumentTemplateView> {
    DocumentTemplate.assertCanBeManagedBy(command.actor);
    return this.locks.run(`TEMPLATE:${command.templateId}`, () => this.modify(command));
  }

  private async modify(command: UpdateDocumentTemplateCommand): Promise<DocumentTemplateView> {
    const stored = await this.templates.findForModification(command.templateId);
    if (!stored) {
      throw new DocumentTemplateNotFoundError();
    }
    const { template } = stored;

    const modification = template.modify({
      name: command.name,
      jurisdictions: command.jurisdictions,
      copyToNewCases: command.copyToNewCases,
      file: command.file,
      byUserId: command.actor.userId,
      now: this.clock.now(),
    });
    if (command.name != null && (await this.templates.existsByName(template.name, command.templateId))) {
      throw new DocumentTemplateAlreadyExistsError();
    }

    const created: string[] = [];
    let view: DocumentTemplateView | null;
    let trash: string[] = [];
    try {
      let placements: TemplateFilePlacement[] | null = null;
      if (modification.touchesStorage) {
        placements = await this.storeFiles(command, template, stored, created);
        trash = TemplateStoredFiles.hydrate({
          mainFileId: stored.mainFileId,
          jurisdictionFileIds: stored.placements.map((placement) => placement.cloudFileId),
        }).unreferencedBy(placements.map((placement) => placement.cloudFileId));
      }
      view = await this.templates.update(command.templateId, { template, placements, trash });
    } catch (error) {
      await this.cloudFiles.discard(created);
      throw error;
    }
    if (!view) {
      // Given de baja while this request was running (HU37): nothing was written.
      await this.cloudFiles.discard(created);
      throw new DocumentTemplateNotFoundError();
    }

    await this.moveToTrash(command.templateId, trash);
    return view;
  }

  /**
   * The template's whole new set of files, the first one being the main file
   * (D-109). With a new file, it goes to every jurisdiction of the result. Without
   * one, the files it already has are kept and the current one is copied to the
   * jurisdictions that have none: those that are added and, in a template older
   * than the subfolders, all of them.
   */
  private async storeFiles(
    command: UpdateDocumentTemplateCommand,
    template: DocumentTemplate,
    stored: TemplateForModification,
    created: string[],
  ): Promise<TemplateFilePlacement[]> {
    const targets = await this.cloudFiles.foldersFor(template.jurisdictionsInContractOrder);
    if (command.file) {
      return this.cloudFiles.upload(
        { name: template.fileName, mimeType: command.file.mimeType, content: command.file.content },
        targets,
        created,
      );
    }

    const kept = new Map(stored.placements.map((placement) => [placement.jurisdiction, placement]));
    const missing = targets.filter(({ jurisdiction }) => !kept.has(jurisdiction));
    const copies = new Map(
      (await this.cloudFiles.copy(stored.mainFileId, template.fileName, missing, created)).map((placement) => [
        placement.jurisdiction,
        placement,
      ]),
    );
    return targets.map(({ jurisdiction }) => (kept.get(jurisdiction) ?? copies.get(jurisdiction))!);
  }

  /** Complementary (D-125): a failure is logged and left for the daily process, never raised. */
  private async moveToTrash(templateId: number, fileIds: readonly string[]): Promise<void> {
    if (fileIds.length === 0) {
      return;
    }
    try {
      await this.bin.moveFiles(fileIds);
      await this.templates.clearPendingTrash(fileIds);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Files of template ${templateId} left for the daily process: ${reason}`);
    }
  }
}
