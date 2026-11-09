import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CaseFile } from '../../../core/domain/entities/case-file.entity';
import { CaseFileVersionTakenError } from '../../../core/domain/errors/documents.errors';
import { CaseFileRef, CaseFileRepository, SavedCaseFile } from '../../../core/domain/ports/case-file.repository';

/** The unique index that numbers the versions of a case (`case_files_case_id_version_key`). */
const VERSION_INDEX = 'case_files_case_id_version_key';

/**
 * Prisma {@link CaseFileRepository} over `case_files` (HU38 reads it, HU25
 * writes it). `cloud_file_id` is unique, so a storage id names at most one
 * case file; `(case_id, version)` is unique too, which is what stops two
 * generations of the same case from taking the same number.
 */
@Injectable()
export class PrismaCaseFileRepository implements CaseFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCloudFileIds(cloudFileIds: readonly string[]): Promise<Map<string, CaseFileRef>> {
    if (cloudFileIds.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.db.caseFile.findMany({
      where: { cloudFileId: { in: [...cloudFileIds] } },
      select: { id: true, version: true, cloudFileId: true },
    });
    return new Map(rows.map((row) => [row.cloudFileId, { id: row.id, version: row.version }]));
  }

  async findByCloudFileId(cloudFileId: string): Promise<CaseFileRef | null> {
    return this.prisma.db.caseFile.findUnique({
      where: { cloudFileId },
      select: { id: true, version: true },
    });
  }

  async nextVersion(caseId: number): Promise<number> {
    const { _max } = await this.prisma.db.caseFile.aggregate({ where: { caseId }, _max: { version: true } });
    return (_max.version ?? 0) + 1;
  }

  async save(caseFile: CaseFile): Promise<SavedCaseFile> {
    try {
      const row = await this.prisma.db.caseFile.create({
        data: {
          caseId: caseFile.caseId,
          version: caseFile.version,
          cloudFileId: caseFile.cloudFileId,
          fileName: caseFile.fileName,
          pageCount: caseFile.pageCount,
          generatedByUserId: caseFile.generatedByUserId,
          generatedAt: caseFile.generatedAt,
        },
        select: { id: true, generatedBy: { select: { id: true, lastName: true, firstName: true } } },
      });
      return { id: row.id, generatedBy: row.generatedBy };
    } catch (error) {
      // Only the version index is translated: a repeated `cloud_file_id` is a bug, not a race.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        violatedIndex(error) === VERSION_INDEX
      ) {
        throw new CaseFileVersionTakenError(caseFile.version);
      }
      throw error;
    }
  }
}

/** With the `PrismaPg` driver adapter the violated index arrives in `meta.driverAdapterError` (see `PrismaCloudFolderRepository`). */
function violatedIndex(error: Prisma.PrismaClientKnownRequestError): string | undefined {
  const meta = error.meta as { driverAdapterError?: { cause?: { constraint?: { index?: string } } } } | undefined;
  return meta?.driverAdapterError?.cause?.constraint?.index;
}
