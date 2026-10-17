import { Injectable } from '@nestjs/common';
import {
  DocumentStoragePort,
  FolderReference,
  StoredFolder,
} from '../../../core/domain/ports/document-storage.port';

/** A folder held by {@link InMemoryDocumentStorage}. */
export interface InMemoryStoredFolder extends StoredFolder {
  parentId: string;
  name: string;
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
  private nextFailure: Error | null = null;
  private sequence = 0;

  /** Every call received, in order. */
  readonly calls: Array<{ method: 'findByReference' | 'create'; reference: FolderReference }> = [];

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
