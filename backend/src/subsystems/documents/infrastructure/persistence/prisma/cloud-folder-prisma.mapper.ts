import { CloudFolder } from '../../../core/domain/entities/cloud-folder.entity';
import { CloudFolderFactory } from '../../../core/domain/factories/cloud-folder.factory';
import { CloudFolderKind } from '../../../core/domain/value-objects/cloud-folder-kind';

/**
 * Prisma row shape for `cloud_folders`, with the id of the case that links
 * to it (`cases.cloud_folder_id`), if any.
 */
export type CloudFolderRow = {
  cloudFolderId: string;
  kind: CloudFolderKind;
  name: string;
  url: string;
  parentCloudFolderId: string | null;
  lawyerId: number | null;
  jurisdictionId: number | null;
  createdAt: Date;
  case?: { id: number } | null;
};

export class CloudFolderPrismaMapper {
  /** Persisted kind of a folder: the entities carry no `kind`, their class is the kind. */
  static kindOf(folder: CloudFolder): CloudFolderKind {
    return folder.key.kind;
  }

  static toDomain(row: CloudFolderRow): CloudFolder {
    return CloudFolderFactory.hydrate({
      kind: row.kind,
      cloudFolderId: row.cloudFolderId,
      name: row.name,
      url: row.url,
      parentCloudFolderId: row.parentCloudFolderId,
      lawyerId: row.lawyerId,
      jurisdictionId: row.jurisdictionId,
      caseId: row.case?.id ?? null,
      createdAt: row.createdAt,
    });
  }
}
