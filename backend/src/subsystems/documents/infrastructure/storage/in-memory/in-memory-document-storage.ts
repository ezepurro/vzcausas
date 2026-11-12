import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib';
import { Injectable } from '@nestjs/common';
import {
  DocumentStoragePort,
  FileCopy,
  FileUpload,
  FolderReference,
  FolderRelocation,
  StoredDocument,
  StoredFile,
  StoredFolder,
} from '../../../core/domain/ports/document-storage.port';
import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';

const GOOGLE_NATIVE_PREFIX = 'application/vnd.google-apps.';
const WORD_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

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
  private readonly methodFailures = new Map<string, Error>();
  private sequence = 0;

  /** Every folder call received, in order. */
  readonly calls: Array<{ method: 'findFolderByReference' | 'createFolder'; reference: FolderReference }> = [];

  /** Ids asked to `getFolder`, and ids deleted by `deleteFolder`, in order. */
  readonly getFolderCalls: string[] = [];
  readonly deletedFolderIds: string[] = [];
  /** Every `relocateFolder` received, in order (HU19). */
  readonly relocations: FolderRelocation[] = [];

  /** Every file call received, in order: the uploaded name, or the id deleted or downloaded. */
  readonly fileCalls: Array<
    | { method: 'uploadFile'; name: string }
    | { method: 'deleteFile' | 'downloadFile' | 'copyFile' | 'findFile' | 'exportFile' | 'convertToPdf'; fileId: string }
    | { method: 'listFiles'; folderId: string }
  > = [];

  /** Makes the next call reject with `error` (once). */
  failNextWith(error: Error): void {
    this.nextFailure = error;
  }

  /** Makes the next call to that method reject with `error` (once); the other methods keep working. */
  failNextCallTo(method: keyof DocumentStoragePort, error: Error): void {
    this.methodFailures.set(method, error);
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
    this.relocations.length = 0;
    this.nextFailure = null;
    this.methodFailures.clear();
  }

  /** Folders currently held. */
  get folders(): readonly InMemoryStoredFolder[] {
    return this.stored;
  }

  async findFolderByReference(reference: FolderReference): Promise<StoredFolder | null> {
    this.calls.push({ method: 'findFolderByReference', reference });
    this.failIfRequested('findFolderByReference');
    const found = this.stored.find(
      (folder) => folder.parentId === reference.parentId && folder.name === reference.name,
    );
    return found ? { id: found.id, url: found.url } : null;
  }

  async createFolder(reference: FolderReference): Promise<StoredFolder> {
    this.calls.push({ method: 'createFolder', reference });
    this.failIfRequested('createFolder');
    return this.add(reference.parentId, reference.name);
  }

  async getFolder(folderId: string): Promise<StoredFolder | null> {
    this.getFolderCalls.push(folderId);
    this.failIfRequested('getFolder');
    const found = this.stored.find((folder) => folder.id === folderId);
    return found ? { id: found.id, url: found.url } : null;
  }

  /** Like a drive: the id stays, the content goes along, and a missing folder or parent is a configuration error. */
  async relocateFolder(relocation: FolderRelocation): Promise<StoredFolder> {
    this.relocations.push({ ...relocation });
    this.failIfRequested('relocateFolder');
    const folder = this.stored.find((stored) => stored.id === relocation.folderId);
    const parentMissing =
      relocation.newParentId !== undefined && !this.stored.some((stored) => stored.id === relocation.newParentId);
    if (!folder || parentMissing) {
      throw new DocumentStorageUnavailableError(
        'CONFIGURATION',
        'The folder to rename or move, or its new parent, no longer exists in the storage',
      );
    }
    if (relocation.name !== undefined) {
      folder.name = relocation.name;
    }
    if (relocation.newParentId !== undefined) {
      folder.parentId = relocation.newParentId;
    }
    return { id: folder.id, url: folder.url };
  }

  /** Like a drive, deleting a folder also removes what is inside it. */
  async deleteFolder(folderId: string): Promise<void> {
    this.deletedFolderIds.push(folderId);
    this.failIfRequested('deleteFolder');
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
    this.failIfRequested('uploadFile');
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
    this.failIfRequested('copyFile');
    const original = this.storedFiles.find((stored) => stored.id === copy.fileId);
    if (!original) {
      throw new Error(`The file ${copy.fileId} is not in the storage.`);
    }
    return this.upload({ parentId: copy.parentId, name: copy.name, mimeType: original.mimeType, content: original.content });
  }

  async deleteFile(fileId: string): Promise<void> {
    this.fileCalls.push({ method: 'deleteFile', fileId });
    this.failIfRequested('deleteFile');
    this.storedFiles = this.storedFiles.filter((file) => file.id !== fileId);
  }

  /** Like a drive asked for a file that is gone, a missing id fails: it is not an empty file. */
  async downloadFile(fileId: string): Promise<Buffer> {
    this.fileCalls.push({ method: 'downloadFile', fileId });
    this.failIfRequested('downloadFile');
    const file = this.storedFiles.find((stored) => stored.id === fileId);
    if (!file) {
      throw new Error(`The file ${fileId} is not in the storage.`);
    }
    return Buffer.from(file.content);
  }

  /** Files directly in the folder and not in the trash; subfolders are folders, not files. */
  async listFiles(folderId: string): Promise<StoredDocument[]> {
    this.fileCalls.push({ method: 'listFiles', folderId });
    this.failIfRequested('listFiles');
    return this.storedFiles.filter((file) => file.parentId === folderId && !file.trashed).map(toStoredDocument);
  }

  async findFile(fileId: string): Promise<StoredDocument | null> {
    this.fileCalls.push({ method: 'findFile', fileId });
    this.failIfRequested('findFile');
    const file = this.storedFiles.find((stored) => stored.id === fileId && !stored.trashed);
    return file ? toStoredDocument(file) : null;
  }

  /**
   * Like a drive, only its native documents can be exported. The result is a
   * real one-page PDF that names what it came from, so a case file can join it.
   */
  async exportFile(fileId: string, mimeType: string): Promise<Buffer> {
    this.fileCalls.push({ method: 'exportFile', fileId });
    this.failIfRequested('exportFile');
    const file = this.storedFiles.find((stored) => stored.id === fileId);
    if (!file || !file.mimeType.startsWith(GOOGLE_NATIVE_PREFIX) || mimeType !== 'application/pdf') {
      throw new Error(`The file ${fileId} is not a native document of the storage.`);
    }
    return onePagePdf(`Exportado de ${file.name}`);
  }

  /** Like a drive converting a Word file: a real one-page PDF that names what it came from. */
  async convertToPdf(fileId: string): Promise<Buffer> {
    this.fileCalls.push({ method: 'convertToPdf', fileId });
    this.failIfRequested('convertToPdf');
    const file = this.storedFiles.find((stored) => stored.id === fileId);
    if (!file || !WORD_MIME_TYPES.has(file.mimeType)) {
      throw new Error(`The file ${fileId} is not a Word file.`);
    }
    return onePagePdf(`Convertido de ${file.name}`);
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

  private failIfRequested(method: keyof DocumentStoragePort): void {
    const methodFailure = this.methodFailures.get(method);
    if (methodFailure) {
      this.methodFailures.delete(method);
      throw methodFailure;
    }
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

/** A real A4 PDF of one page with a line of text: what a drive would hand back after converting. */
async function onePagePdf(text: string): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  // Kept to plain ASCII: a test fake does not need the font that draws accents.
  page.drawText(text.normalize('NFD').replace(/[^ -~]/g, ''), { x: 72, y: 760, size: 12, font });
  return Buffer.from(await pdf.save());
}
