/** DI token for {@link DocumentStoragePort}. */
export const DOCUMENT_STORAGE = Symbol('DOCUMENT_STORAGE');

/** A folder as the storage provider knows it. */
export interface StoredFolder {
  /** Provider's own identifier; the only stable way to reference the folder. */
  id: string;
  /** Link that opens the folder in the provider's web UI. */
  url: string;
}

/** Where a folder lives: its name under a parent folder. */
export interface FolderReference {
  parentId: string;
  name: string;
}

/**
 * Port towards the document storage provider (a cloud drive). The domain
 * knows nothing about which one: no provider types cross this boundary.
 *
 * Every method rejects with `DocumentStorageUnavailableError` when the
 * provider is unreachable, refuses our credentials or times out.
 */
export interface DocumentStoragePort {
  /** The folder with that name directly under that parent, or `null`. */
  findByReference(reference: FolderReference): Promise<StoredFolder | null>;

  /**
   * Creates a folder under the parent. The folder is private to the study:
   * it is not shared by public link nor with outsiders (CA-39.8).
   */
  create(reference: FolderReference): Promise<StoredFolder>;
}
