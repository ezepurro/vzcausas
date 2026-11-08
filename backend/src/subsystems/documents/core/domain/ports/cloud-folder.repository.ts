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

  /**
   * Writes the name, the parent and the lawyer of a folder that was renamed or
   * moved (HU19, D-104), in one update: the shape check of the table needs the
   * parent and the lawyer to change together. Called only after the provider
   * confirmed the change, so the row always says where the folder really is.
   */
  saveRelocation(folder: CloudFolder): Promise<void>;
}
