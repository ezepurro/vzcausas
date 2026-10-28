import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  CaseFolderStatePort,
  CaseFolderView,
} from '../../../core/domain/ports/case-folder-state.port';
import { CASE_FOLDER_INCLUDE, TEMPLATE_COPIES_SELECT, toCaseFolderView } from '../mappers/case-folder-prisma.mapper';

/**
 * {@link CaseFolderStatePort} over the folder columns of `cases`
 * (`folder_status`, `cloud_folder_id`).
 *
 * Every change is a single `UPDATE ... WHERE`, so the check and the write
 * happen together in the database: that is what makes the gate safe when two
 * requests arrive at the same time.
 */
@Injectable()
export class CaseFolderStatePrismaAdapter implements CaseFolderStatePort {
  constructor(private readonly prisma: PrismaService) {}

  async startCreating(caseId: number): Promise<boolean> {
    // `NULL` has to be asked for apart: `{ notIn: [...] }` would leave out the
    // cases that have no status at all.
    const { count } = await this.prisma.db.case.updateMany({
      where: {
        id: caseId,
        OR: [{ folderStatus: null }, { folderStatus: { in: ['PENDING', 'ERROR'] } }],
      },
      data: { folderStatus: 'CREATING' },
    });
    return count === 1;
  }

  async markCreated(caseId: number, cloudFolderId: string): Promise<void> {
    await this.prisma.db.case.updateMany({
      where: { id: caseId },
      data: { cloudFolderId, folderStatus: 'CREATED' },
    });
  }

  async markFailed(caseId: number): Promise<void> {
    await this.prisma.db.case.updateMany({
      where: { id: caseId, folderStatus: 'CREATING' },
      data: { folderStatus: 'ERROR' },
    });
  }

  async find(caseId: number): Promise<CaseFolderView | null> {
    const row = await this.prisma.db.case.findUnique({
      where: { id: caseId },
      select: { folderStatus: true, cloudFolder: CASE_FOLDER_INCLUDE, templateCopies: TEMPLATE_COPIES_SELECT },
    });
    return row ? toCaseFolderView(row) : null;
  }
}
