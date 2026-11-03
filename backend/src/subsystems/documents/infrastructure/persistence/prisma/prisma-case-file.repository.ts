import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CaseFileRef, CaseFileRepository } from '../../../core/domain/ports/case-file.repository';

/**
 * Prisma {@link CaseFileRepository} over `case_files` (HU38), read only.
 * `cloud_file_id` is unique, so a storage id names at most one case file.
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
}
