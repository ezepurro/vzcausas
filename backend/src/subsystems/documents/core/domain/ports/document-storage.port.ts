/** DI token for {@link DocumentStoragePort}. */
export const DOCUMENT_STORAGE = Symbol('DOCUMENT_STORAGE');

/** A folder as the storage provider knows it. */
export interface StoredFolder {
  /** Provider's own identifier; the only stable way to reference the folder. */
  id: string;
  /** Link that opens the folder in the provider's web UI. */
  url: string;
}

/**
 * Where a folder lives: its name under a parent folder. `parentId` is `null`
 * for the root of the storage account (only the study's `MAIN` folder is there).
 */
export interface FolderReference {
  parentId: string | null;
  name: string;
}

/**
 * A change to an existing folder (HU19, D-104): its new name, its new parent,
 * or both in one step. What is left out stays as it is.
 */
export interface FolderRelocation {
  /** Provider id of the folder to rename or move. */
  folderId: string;
  /** The new name, if it changes. */
  name?: string;
  /** Provider id of the folder it moves under, if it changes. */
  newParentId?: string;
}

/** A file as the storage provider knows it. */
export interface StoredFile {
  /** Provider's own identifier; the only stable way to reference the file. */
  id: string;
  /** Link that opens the file in the provider's web UI. */
  url: string;
}

/** A file to upload: its name and type, under a parent folder. */
export interface FileUpload {
  parentId: string;
  name: string;
  mimeType: string;
  /** The whole content. Uploads are small (a formal template is at most 10 MB, CA-34.10). */
  content: Buffer;
}

/** A copy of a stored file: the file to copy and where the copy goes (HU40). */
export interface FileCopy {
  /** Provider id of the file to copy. */
  fileId: string;
  parentId: string;
  name: string;
}

/**
 * A file of a folder with what the provider says about it (HU38): enough to
 * show it in a list and to tell whether it belongs to a given folder.
 */
export interface StoredDocument {
  /** Provider's own identifier; opaque to the client. */
  id: string;
  /** The name as it is in the provider, with its extension if it has one. */
  name: string;
  mimeType: string;
  /** `null` when the provider does not measure it (its own native documents). */
  sizeBytes: number | null;
  createdAt: Date;
  modifiedAt: Date;
  /** The provider account that owns it, as the provider names it. `null` if it does not say. */
  uploadedBy: string | null;
  /** Link that opens the file in the provider's web UI. */
  url: string;
  /** Folders the file is directly in. */
  parentIds: string[];
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
  findFolderByReference(reference: FolderReference): Promise<StoredFolder | null>;

  /**
   * Creates a folder under the parent. The folder is private to the study:
   * it is not shared by public link nor with outsiders (CA-39.8).
   */
  createFolder(reference: FolderReference): Promise<StoredFolder>;

  /** The folder with that provider id, or `null` if it no longer exists (deleted or trashed by hand). */
  getFolder(folderId: string): Promise<StoredFolder | null>;

  /**
   * Renames and/or moves a folder, in one step: its content goes with it and its
   * id does not change (HU19, D-104). It does not create the new parent.
   *
   * @throws {DocumentStorageUnavailableError} with reason `CONFIGURATION` if the
   *   folder or the new parent no longer exists: the stored id is no longer valid.
   */
  relocateFolder(relocation: FolderRelocation): Promise<StoredFolder>;

  /**
   * Sends a folder to the provider's trash, with everything in it (HU21, D-104).
   * It is not deleted for good: the provider keeps it for a while and a person
   * can restore it by hand. A folder that is already gone or trashed is not an error.
   */
  trashFolder(folderId: string): Promise<void>;

  /**
   * Deletes a folder with everything in it. Used to undo a folder whose row
   * then could not be saved. A folder that is already gone is not an error.
   */
  deleteFolder(folderId: string): Promise<void>;

  /** Uploads a file into the folder (HU34). Like a real drive, a repeated name makes a second file. */
  uploadFile(upload: FileUpload): Promise<StoredFile>;

  /**
   * Copies a file as it is now into another folder, inside the provider (HU40).
   * The copy is independent: later changes to the original do not reach it (CA-40.6).
   */
  copyFile(copy: FileCopy): Promise<StoredFile>;

  /** Deletes a file. Used to undo an upload whose registration then failed (CA-34.7). */
  deleteFile(fileId: string): Promise<void>;

  /** The current content of a file: its last version (HU35, CA-35.6). */
  downloadFile(fileId: string): Promise<Buffer>;

  /**
   * The files directly in a folder (HU38, CA-38.3): no subfolders, nothing in
   * the trash, in no given order. A folder that no longer exists has none.
   */
  listFiles(folderId: string): Promise<StoredDocument[]>;

  /** The file with that provider id, or `null` if it does not exist, is in the trash or is a folder. */
  findFile(fileId: string): Promise<StoredDocument | null>;

  /**
   * The content of one of the provider's native documents, converted to
   * `mimeType` (HU38: a Google document downloaded as PDF).
   */
  exportFile(fileId: string, mimeType: string): Promise<Buffer>;

  /**
   * A Word file (`.doc`, `.docx`) converted to PDF by the provider (HU25,
   * D-102). The provider may need a temporary copy to convert it: it leaves
   * none behind, whether the conversion works or not.
   */
  convertToPdf(fileId: string): Promise<Buffer>;
}
