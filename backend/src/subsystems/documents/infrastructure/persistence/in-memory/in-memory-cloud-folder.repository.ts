import { Injectable } from '@nestjs/common';
import { CloudFolder } from '../../../core/domain/entities/cloud-folder.entity';
import { CloudFolderAlreadyExistsError } from '../../../core/domain/errors/documents.errors';
import { CloudFolderRepository } from '../../../core/domain/ports/cloud-folder.repository';
import { FolderKey, folderKeyToString } from '../../../core/domain/value-objects/folder-key.vo';

/**
 * In-memory {@link CloudFolderRepository}. It mimics the uniqueness rules of
 * `cloud_folders` (provider id and natural key), so use-case tests exercise
 * the same conflicts the database would raise.
 */
@Injectable()
export class InMemoryCloudFolderRepository implements CloudFolderRepository {
  private readonly byId = new Map<string, CloudFolder>();
  private readonly byKey = new Map<string, CloudFolder>();

  /** Number of `save` calls that stored a folder. */
  saveCount = 0;

  async findByKey(key: FolderKey): Promise<CloudFolder | null> {
    return this.byKey.get(folderKeyToString(key)) ?? null;
  }

  async findById(cloudFolderId: string): Promise<CloudFolder | null> {
    return this.byId.get(cloudFolderId) ?? null;
  }

  async save(folder: CloudFolder): Promise<void> {
    const key = folderKeyToString(folder.key);
    if (this.byId.has(folder.cloudFolderId) || this.byKey.has(key)) {
      throw new CloudFolderAlreadyExistsError();
    }
    this.byId.set(folder.cloudFolderId, folder);
    this.byKey.set(key, folder);
    this.saveCount += 1;
  }

  /** Every stored folder, in insertion order. */
  all(): CloudFolder[] {
    return [...this.byId.values()];
  }
}
