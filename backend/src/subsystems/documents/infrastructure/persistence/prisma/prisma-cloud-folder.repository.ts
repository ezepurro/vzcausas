import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Prisma } from '../../../../../generated/prisma/client';
import { CloudFolder } from '../../../core/domain/entities/cloud-folder.entity';
import { CloudFolderAlreadyExistsError } from '../../../core/domain/errors/documents.errors';
import { CloudFolderRepository } from '../../../core/domain/ports/cloud-folder.repository';
import { FolderKey } from '../../../core/domain/value-objects/folder-key.vo';
import { CloudFolderPrismaMapper } from './cloud-folder-prisma.mapper';

const INCLUDE_CASE_ID = { case: { select: { id: true } } } as const;

/**
 * Prisma {@link CloudFolderRepository} over `cloud_folders`.
 *
 * It never writes `cases`: the link between a case and its folder
 * (`cases.cloud_folder_id`) belongs to that subsystem. Until `cases` sets it,
 * a `CASE` folder cannot be found by `FolderKey.forCase`.
 */
@Injectable()
export class PrismaCloudFolderRepository implements CloudFolderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: FolderKey): Promise<CloudFolder | null> {
    const row = await this.prisma.db.cloudFolder.findFirst({
      where: this.toWhere(key),
      include: INCLUDE_CASE_ID,
    });
    return row ? CloudFolderPrismaMapper.toDomain(row) : null;
  }

  async findById(cloudFolderId: string): Promise<CloudFolder | null> {
    const row = await this.prisma.db.cloudFolder.findUnique({
      where: { cloudFolderId },
      include: INCLUDE_CASE_ID,
    });
    return row ? CloudFolderPrismaMapper.toDomain(row) : null;
  }

  async save(folder: CloudFolder): Promise<void> {
    try {
      await this.prisma.db.cloudFolder.create({
        data: {
          cloudFolderId: folder.cloudFolderId,
          kind: CloudFolderPrismaMapper.kindOf(folder),
          name: folder.name,
          url: folder.url,
          parentCloudFolderId: folder.parentCloudFolderId,
          lawyerId: folder.lawyerId,
          jurisdictionId: folder.jurisdictionId,
          createdAt: folder.createdAt,
        },
      });
    } catch (error) {
      this.translateUniqueViolation(error);
    }
  }

  private toWhere(key: FolderKey): Prisma.CloudFolderWhereInput {
    switch (key.kind) {
      case 'LAWYER':
        return { kind: 'LAWYER', lawyerId: key.lawyerId };
      case 'JURISDICTION':
        return { kind: 'JURISDICTION', lawyerId: key.lawyerId, jurisdictionId: key.jurisdictionId };
      case 'CASE':
        return { kind: 'CASE', case: { is: { id: key.caseId } } };
      default:
        return { kind: key.kind };
    }
  }

  /**
   * Two concurrent requests can both miss the lookup and try to insert the
   * same folder; the unique indexes of `cloud_folders` stop the second one.
   * Only a violation of one of those indexes is translated; anything else is
   * rethrown untouched.
   *
   * With the `PrismaPg` driver adapter the violated index arrives in
   * `meta.driverAdapterError.cause.constraint.index`.
   */
  private translateUniqueViolation(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      this.violatedIndex(error)?.startsWith('cloud_folders_')
    ) {
      throw new CloudFolderAlreadyExistsError();
    }
    throw error;
  }

  private violatedIndex(error: Prisma.PrismaClientKnownRequestError): string | undefined {
    const meta = error.meta as
      | { driverAdapterError?: { cause?: { constraint?: { index?: string } } } }
      | undefined;
    return meta?.driverAdapterError?.cause?.constraint?.index;
  }
}
