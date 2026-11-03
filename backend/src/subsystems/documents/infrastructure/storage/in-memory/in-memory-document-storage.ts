import { Injectable } from '@nestjs/common';
import {
  DocumentStoragePort,
  FileCopy,
  FileUpload,
  FolderReference,
  StoredDocument,
  StoredFile,
  StoredFolder,
} from '../../../core/domain/ports/document-storage.port';

const GOOGLE_NATIVE_PREFIX = 'application/vnd.google-apps.';

/** A folder held by {@link InMemoryDocumentStorage}. */
export interface InMemoryStoredFolder extends StoredFolder {
  parentId: string | null;
  name: string;
}

/** A file held by {@link InMemoryDocumentStorage}. */
export interface InMemoryStoredFile extends StoredFile {
  parentId: string;
  name: string;
  mimeType: string;
  size: number;
  content: Buffer;
  createdAt: Date;
  modifiedAt: Date;
  uploadedBy: string | null;
  /** In the trash: the storage keeps it, but it is not listed nor found (HU38). */
  trashed: boolean;
}

/** A file put in a folder by hand, as a person would upload it to the drive (HU38). */
export interface SeededFile {
  /** Fixed id; a generated one if absent. */
  id?: string;
  parentId: string;
  name: string;
  mimeType: string;
  content?: Buffer;
  createdAt: Date;
  modifiedAt?: Date;
  uploadedBy?: string | null;
  trashed?: boolean;
}

/**
 * In-memory {@link DocumentStoragePort} for tests and local development: no
 * network, no Google. Like a real drive, `create` always makes a new folder
 * (two with the same name can coexist), so a use case that is not idempotent
 * shows up as duplicates here.
 */
@Injectable()
export class InMemoryDocumentStorage implements DocumentStoragePort {
  private readonly stored: InMemoryStoredFolder[] = [];
  private storedFiles: InMemoryStoredFile[] = [];
  private nextFailure: Error | null = null;
  private sequence = 0;

  /** Every folder call received, in order. */
  readonly calls: Array<{ method: 'findFolderByReference' | 'createFolder'; reference: FolderReference }> = [];

  /** Ids asked to `getFolder`, and ids deleted by `deleteFolder`, in order. */
  readonly getFolderCalls: string[] = [];
  readonly deletedFolderIds: string[] = [];

  /** Every file call received, in order: the uploaded name, or the id deleted or downloaded. */
  readonly fileCalls: Array<
    | { method: 'uploadFile'; name: string }
    | { method: 'deleteFile' | 'downloadFile' | 'copyFile' | 'findFile' | 'exportFile'; fileId: string }
    | { method: 'listFiles'; folderId: string }
  > = [];

  /** Makes the next call reject with `error` (once). */
  failNextWith(error: Error): void {
    this.nextFailure = error;
  }

  /** Registers a folder that already exists in the storage (e.g. the study's root). */
  seed(parentId: string | null, name: string): StoredFolder {
    return this.add(parentId, name);
  }

  /** Puts a file in a folder without going through `uploadFile`: no call is recorded. */
  seedFile(file: SeededFile): StoredFile {
    this.sequence += 1;
    const id = file.id ?? `mem-file-${this.sequence}`;
    const content = file.content ?? Buffer.from(`contenido de ${file.name}`);
    this.storedFiles.push({
      id,
      url: `https://storage.invalid/files/${id}`,
      parentId: file.parentId,
      name: file.name,
      mimeType: file.mimeType,
      size: content.length,
      content,
      createdAt: file.createdAt,
      modifiedAt: file.modifiedAt ?? file.createdAt,
      uploadedBy: file.uploadedBy ?? null,
      trashed: file.trashed ?? false,
    });
    return { id, url: `https://storage.invalid/files/${id}` };
  }

  /** Renames a file, as a person would in the drive's web UI. */
  renameFile(fileId: string, name: string): void {
    const file = this.storedFiles.find((stored) => stored.id === fileId);
    if (!file) {
      throw new Error(`The file ${fileId} is not in the storage.`);
    }
    file.name = name;
  }

  /** Forgets every folder, file and call: back to an empty storage. */
  reset(): void {
    this.stored.length = 0;
    this.storedFiles = [];
    this.calls.length = 0;
    this.fileCalls.length = 0;
    this.getFolderCalls.length = 0;
    this.deletedFolderIds.length = 0;
    this.nextFailure = null;
  }

  /** Folders currently held. */
  get folders(): readonly InMemoryStoredFolder[] {
    return this.stored;
  }

  async findFolderByReference(reference: FolderReference): Promise<StoredFolder | null> {
    this.calls.push({ method: 'findFolderByReference', reference });
    this.failIfRequested();
    const found = this.stored.find(
      (folder) => folder.parentId === reference.parentId && folder.name === reference.name,
    );
    return found ? { id: found.id, url: found.url } : null;
  }

  async createFolder(reference: FolderReference): Promise<StoredFolder> {
    this.calls.push({ method: 'createFolder', reference });
    this.failIfRequested();
    return this.add(reference.parentId, reference.name);
  }

  async getFolder(folderId: string): Promise<StoredFolder | null> {
    this.getFolderCalls.push(folderId);
    this.failIfRequested();
    const found = this.stored.find((folder) => folder.id === folderId);
    return found ? { id: found.id, url: found.url } : null;
  }

  /** Like a drive, deleting a folder also removes what is inside it. */
  async deleteFolder(folderId: string): Promise<void> {
    this.deletedFolderIds.push(folderId);
    this.failIfRequested();
    const doomed = new Set<string>([folderId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const folder of this.stored) {
        if (folder.parentId !== null && doomed.has(folder.parentId) && !doomed.has(folder.id)) {
          doomed.add(folder.id);
          grew = true;
        }
      }
    }
    const kept = this.stored.filter((folder) => !doomed.has(folder.id));
    this.stored.length = 0;
    this.stored.push(...kept);
    this.storedFiles = this.storedFiles.filter((file) => !doomed.has(file.parentId));
  }

  /** Files currently held. */
  get files(): readonly InMemoryStoredFile[] {
    return this.storedFiles;
  }

  async uploadFile(upload: FileUpload): Promise<StoredFile> {
    this.fileCalls.push({ method: 'uploadFile', name: upload.name });
    this.failIfRequested();
    return this.upload(upload);
  }

  private upload(upload: FileUpload): StoredFile {
    this.sequence += 1;
    const id = `mem-file-${this.sequence}`;
    const file: InMemoryStoredFile = {
      id,
      url: `https://storage.invalid/files/${id}`,
      parentId: upload.parentId,
      name: upload.name,
      mimeType: upload.mimeType,
      size: upload.content.length,
      content: Buffer.from(upload.content),
      createdAt: new Date(),
      modifiedAt: new Date(),
      uploadedBy: null,
      trashed: false,
    };
    this.storedFiles.push(file);
    return { id: file.id, url: file.url };
  }

  /** The copy gets its own bytes, so changing the original afterwards does not reach it (CA-40.6). */
  async copyFile(copy: FileCopy): Promise<StoredFile> {
    this.fileCalls.push({ method: 'copyFile', fileId: copy.fileId });
    this.failIfRequested();
    const original = this.storedFiles.find((stored) => stored.id === copy.fileId);
    if (!original) {
      throw new Error(`The file ${copy.fileId} is not in the storage.`);
    }
    return this.upload({ parentId: copy.parentId, name: copy.name, mimeType: original.mimeType, content: original.content });
  }

  async deleteFile(fileId: string): Promise<void> {
    this.fileCalls.push({ method: 'deleteFile', fileId });
    this.failIfRequested();
    this.storedFiles = this.storedFiles.filter((file) => file.id !== fileId);
  }

  /** Like a drive asked for a file that is gone, a missing id fails: it is not an empty file. */
  async downloadFile(fileId: string): Promise<Buffer> {
    this.fileCalls.push({ method: 'downloadFile', fileId });
    this.failIfRequested();
    const file = this.storedFiles.find((stored) => stored.id === fileId);
    if (!file) {
      throw new Error(`The file ${fileId} is not in the storage.`);
    }
    return Buffer.from(file.content);
  }

  /** Files directly in the folder and not in the trash; subfolders are folders, not files. */
  async listFiles(folderId: string): Promise<StoredDocument[]> {
    this.fileCalls.push({ method: 'listFiles', folderId });
    this.failIfRequested();
    return this.storedFiles.filter((file) => file.parentId === folderId && !file.trashed).map(toStoredDocument);
  }

  async findFile(fileId: string): Promise<StoredDocument | null> {
    this.fileCalls.push({ method: 'findFile', fileId });
    this.failIfRequested();
    const file = this.storedFiles.find((stored) => stored.id === fileId && !stored.trashed);
    return file ? toStoredDocument(file) : null;
  }

  /** Like a drive, only its native documents can be exported; the "PDF" says what it came from. */
  async exportFile(fileId: string, mimeType: string): Promise<Buffer> {
    this.fileCalls.push({ method: 'exportFile', fileId });
    this.failIfRequested();
    const file = this.storedFiles.find((stored) => stored.id === fileId);
    if (!file || !file.mimeType.startsWith(GOOGLE_NATIVE_PREFIX)) {
      throw new Error(`The file ${fileId} is not a native document of the storage.`);
    }
    return Buffer.from(`${mimeType} exportado de ${file.name}`);
  }

  private add(parentId: string | null, name: string): StoredFolder {
    this.sequence += 1;
    const id = `mem-folder-${this.sequence}`;
    const folder: InMemoryStoredFolder = {
      id,
      url: `https://storage.invalid/folders/${id}`,
      parentId,
      name,
    };
    this.stored.push(folder);
    return { id: folder.id, url: folder.url };
  }

  private failIfRequested(): void {
    if (this.nextFailure) {
      const error = this.nextFailure;
      this.nextFailure = null;
      throw error;
    }
  }
}

function toStoredDocument(file: InMemoryStoredFile): StoredDocument {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    // Like Drive, the storage does not measure its native documents.
    sizeBytes: file.mimeType.startsWith(GOOGLE_NATIVE_PREFIX) ? null : file.size,
    createdAt: file.createdAt,
    modifiedAt: file.modifiedAt,
    uploadedBy: file.uploadedBy,
    url: file.url,
    parentIds: [file.parentId],
  };
}
