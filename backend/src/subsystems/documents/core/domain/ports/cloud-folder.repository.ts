import { CloudFolder } from '../entities/cloud-folder.entity';
import { FolderKey } from '../value-objects/folder-key.vo';

/** DI token for {@link CloudFolderRepository}. */
export const CLOUD_FOLDER_REPOSITORY = Symbol('CLOUD_FOLDER_REPOSITORY');

/** Persistence of the study's cloud folders (the `cloud_folders` table). */
export interface CloudFolderRepository {
  /** The folder with that natural key, or `null`. */
  findByKey(key: FolderKey): Promise<CloudFolder | null>;

  /** The folder with that provider id, or `null`. */
  findById(cloudFolderId: string): Promise<CloudFolder | null>;

  /**
   * Stores a new folder.
   *
   * @throws {CloudFolderAlreadyExistsError} if a folder with the same unique
   *   key (or provider id) already exists, e.g. a concurrent request won.
   */
  save(folder: CloudFolder): Promise<void>;
}
