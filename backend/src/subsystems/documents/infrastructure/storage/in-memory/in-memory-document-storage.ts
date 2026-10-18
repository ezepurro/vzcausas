import { Injectable } from '@nestjs/common';
import {
  DocumentStoragePort,
  FileUpload,
  FolderReference,
  StoredFile,
  StoredFolder,
} from '../../../core/domain/ports/document-storage.port';

/** A folder held by {@link InMemoryDocumentStorage}. */
export interface InMemoryStoredFolder extends StoredFolder {
  parentId: string;
  name: string;
}

/** A file held by {@link InMemoryDocumentStorage}. */
export interface InMemoryStoredFile extends StoredFile {
  parentId: string;
  name: string;
  mimeType: string;
  size: number;
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
  readonly calls: Array<{ method: 'findByReference' | 'create'; reference: FolderReference }> = [];

  /** Every file call received, in order: the uploaded name, or the deleted id. */
  readonly fileCalls: Array<{ method: 'uploadFile'; name: string } | { method: 'deleteFile'; fileId: string }> = [];

  /** Makes the next call reject with `error` (once). */
  failNextWith(error: Error): void {
    this.nextFailure = error;
  }

  /** Registers a folder that already exists in the storage (e.g. the study's root). */
  seed(parentId: string, name: string): StoredFolder {
    return this.add(parentId, name);
  }

  /** Folders currently held. */
  get folders(): readonly InMemoryStoredFolder[] {
    return this.stored;
  }

  async findByReference(reference: FolderReference): Promise<StoredFolder | null> {
    this.calls.push({ method: 'findByReference', reference });
    this.failIfRequested();
    const found = this.stored.find(
      (folder) => folder.parentId === reference.parentId && folder.name === reference.name,
    );
    return found ? { id: found.id, url: found.url } : null;
  }

  async create(reference: FolderReference): Promise<StoredFolder> {
    this.calls.push({ method: 'create', reference });
    this.failIfRequested();
    return this.add(reference.parentId, reference.name);
  }

  /** Files currently held. */
  get files(): readonly InMemoryStoredFile[] {
    return this.storedFiles;
  }

  async uploadFile(upload: FileUpload): Promise<StoredFile> {
    this.fileCalls.push({ method: 'uploadFile', name: upload.name });
    this.failIfRequested();
    this.sequence += 1;
    const id = `mem-file-${this.sequence}`;
    const file: InMemoryStoredFile = {
      id,
      url: `https://storage.invalid/files/${id}`,
      parentId: upload.parentId,
      name: upload.name,
      mimeType: upload.mimeType,
      size: upload.content.length,
    };
    this.storedFiles.push(file);
    return { id: file.id, url: file.url };
  }

  async deleteFile(fileId: string): Promise<void> {
    this.fileCalls.push({ method: 'deleteFile', fileId });
    this.failIfRequested();
    this.storedFiles = this.storedFiles.filter((file) => file.id !== fileId);
  }

  private add(parentId: string, name: string): StoredFolder {
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
