import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DOCUMENT_TEMPLATE_REPOSITORY,
  DocumentTemplateRepository,
} from '../../domain/ports/document-template.repository';
import { RECYCLE_BIN_FOLDER_NAME, RecycleBin } from '../common/recycle-bin';

export interface MoveTemplateFilesToTrashCommand {
  templateId: number;
}

/**
 * How it ended. `NO_TEMPLATE`: there is no such template, so nothing to move.
 * `MOVED`: every file of the template is now in the `Papelera` folder.
 */
export interface MoveTemplateFilesToTrashResult {
  outcome: 'NO_TEMPLATE' | 'MOVED';
}

/**
 * Moves the files of a formal template given de baja, one per jurisdiction in
 * its list, from `/VZ Causas/Modelos formales/{fuero}` to `/VZ Causas/Papelera`
 * (HU37, CA-37.4, D-131), and then clears the template's `trash_pending` mark.
 *
 * **A move and not Drive's own trash, as for a case folder** (D-104): the files
 * are kept for good, and moving needs nothing beyond `drive.file`.
 *
 * **Idempotent, so it can be run again.** Moving a file that is already in the
 * `Papelera` leaves it there. `DeactivateDocumentTemplate` runs it right after
 * the baja, and the daily process runs it again for every template still marked
 * `trash_pending` because Drive did not answer then (D-131).
 *
 * It tries every file even if one fails, so a single bad file does not leave
 * the rest in the templates folder, and then reports the first failure. The
 * mark is cleared only when **all** the files are in the `Papelera`.
 *
 * It does not decide whether a failure matters: the caller does. For the baja
 * the storage is a complementary effect, so the baja is kept (D-131).
 */
@Injectable()
export class MoveTemplateFilesToTrash {
  private readonly logger = new Logger(MoveTemplateFilesToTrash.name);

  constructor(
    @Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository,
    private readonly bin: RecycleBin,
  ) {}

  /**
   * @throws {StudioRootNotConfiguredError} if the study's root folder is not set up.
   * @throws {DocumentStorageUnavailableError} if the storage fails, or a file no longer exists there.
   */
  async execute(command: MoveTemplateFilesToTrashCommand): Promise<MoveTemplateFilesToTrashResult> {
    const stored = await this.templates.findStoredFiles(command.templateId);
    if (!stored) {
      return { outcome: 'NO_TEMPLATE' };
    }

    await this.bin.moveFiles(stored.fileIds);

    await this.templates.markTrashed(command.templateId);
    this.logger.log(
      `Files of template ${command.templateId} moved to ${RECYCLE_BIN_FOLDER_NAME} (${stored.fileIds.length})`,
    );
    return { outcome: 'MOVED' };
  }
}
