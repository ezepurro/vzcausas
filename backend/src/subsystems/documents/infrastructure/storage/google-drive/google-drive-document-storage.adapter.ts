import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthClientService } from '@shared/infrastructure/google/google-oauth-client.service';
import { drive, drive_v3 } from '@googleapis/drive';
import { Readable } from 'node:stream';
import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';
import {
  DocumentStoragePort,
  FileCopy,
  FileUpload,
  FolderReference,
  StoredDocument,
  StoredFile,
  StoredFolder,
} from '../../../core/domain/ports/document-storage.port';
import { classifyDriveError } from './drive-error.mapper';
import { withDriveRetries } from './drive-retry';

/** The only part of the Drive client this adapter uses: a test passes a fake with just this. */
export type DriveFilesClient = Pick<drive_v3.Drive, 'files'>;

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const GOOGLE_DOCUMENT_MIME_TYPE = 'application/vnd.google-apps.document';
const PDF_MIME_TYPE = 'application/pdf';
const DEFAULT_TIMEOUT_MS = 15_000;
const FILE_FIELDS = 'id, webViewLink';
/** What the document list needs of each file (HU38). */
const DOCUMENT_FIELDS =
  'id, name, mimeType, size, createdTime, modifiedTime, owners(displayName), webViewLink, parents';
/** The most Drive hands out per page; a case folder has tens of files, so one page is the usual. */
const LIST_PAGE_SIZE = 1000;

/**
 * {@link DocumentStoragePort} over the Google Drive API v3, with the study's
 * shared OAuth client (`GoogleOAuthClientService`). With the `drive.file`
 * scope the app only sees what it created itself.
 *
 * - **Privacy (CA-39.8):** it never calls `permissions.*`, so what it creates
 *   stays private to the account that authorized the app.
 * - **Failures:** a call is retried up to 3 times on a passing problem (see
 *   {@link withDriveRetries}); what is left is translated into
 *   {@link DocumentStorageUnavailableError} with its reason. Nothing from the
 *   `@googleapis/drive` library leaves this class.
 * - **Logging:** ids and operations only. Folder and file names carry the
 *   parties of a case, so they are written at `debug` level at most.
 */
@Injectable()
export class GoogleDriveDocumentStorage implements DocumentStoragePort {
  private readonly logger = new Logger(GoogleDriveDocumentStorage.name);
  private readonly drive: DriveFilesClient;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly timeout: number;
  /**
   * Options for every call. `retry: false` turns off the retries `googleapis-common`
   * adds by default (it sets `retry = true` on every request): `withDriveRetries`
   * is the only one that retries, so a call is attempted exactly 3 times, with the
   * waits of ADR-003 §2.5, and not 3 times by us times 4 by the library.
   */
  private readonly requestOptions: { timeout: number; retry: false };

  constructor(
    oauth: GoogleOAuthClientService,
    config: ConfigService,
    // Optional so a test can pass a fake; Nest resolves a constructor parameter
    // typed with a function or interface even if it is optional in TypeScript.
    @Optional() driveClient?: DriveFilesClient,
    @Optional() sleep?: (ms: number) => Promise<void>,
  ) {
    this.drive = driveClient ?? drive({ version: 'v3', auth: oauth.getClient() });
    this.sleep = sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    const configured = Number(config.get<string>('DRIVE_REQUEST_TIMEOUT_MS'));
    this.timeout = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS;
    this.requestOptions = { timeout: this.timeout, retry: false };
  }

  async findFolderByReference(reference: FolderReference): Promise<StoredFolder | null> {
    const parent = reference.parentId ?? 'root';
    const query =
      `'${escapeQueryValue(parent)}' in parents` +
      ` and name = '${escapeQueryValue(reference.name)}'` +
      ` and mimeType = '${FOLDER_MIME_TYPE}'` +
      ' and trashed = false';

    const response = await this.call('findFolderByReference', () =>
      this.drive.files.list(
        { q: query, pageSize: 1, fields: `files(${FILE_FIELDS})`, spaces: 'drive' },
        this.requestOptions,
      ),
    );
    const found = response.data.files?.[0];
    return found?.id ? toStoredFolder(found) : null;
  }

  async createFolder(reference: FolderReference): Promise<StoredFolder> {
    const response = await this.call(
      'createFolder',
      () =>
        this.drive.files.create(
          {
            requestBody: {
              name: reference.name,
              mimeType: FOLDER_MIME_TYPE,
              parents: [reference.parentId ?? 'root'],
            },
            fields: FILE_FIELDS,
          },
          this.requestOptions,
        ),
      'The parent folder no longer exists in the storage',
    );
    if (!response.data.id) {
      throw new DocumentStorageUnavailableError('TRANSIENT', 'Drive answered without a folder id');
    }
    return toStoredFolder(response.data);
  }

  async getFolder(folderId: string): Promise<StoredFolder | null> {
    try {
      const response = await this.call('getFolder', () =>
        this.drive.files.get(
          { fileId: folderId, fields: `${FILE_FIELDS}, trashed` },
          this.requestOptions,
        ),
      );
      return response.data.trashed || !response.data.id ? null : toStoredFolder(response.data);
    } catch (error) {
      if (error instanceof FolderNotFound) {
        return null;
      }
      throw error;
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.deleteById('deleteFolder', folderId);
  }

  async uploadFile(upload: FileUpload): Promise<StoredFile> {
    const response = await this.call(
      'uploadFile',
      () =>
        this.drive.files.create(
          {
            requestBody: { name: upload.name, parents: [upload.parentId] },
            // A stream is consumed by one attempt: build a new one for each.
            media: { mimeType: upload.mimeType, body: Readable.from(upload.content) },
            fields: FILE_FIELDS,
          },
          this.requestOptions,
        ),
      'The destination folder no longer exists in the storage',
    );
    if (!response.data.id) {
      throw new DocumentStorageUnavailableError('TRANSIENT', 'Drive answered without a file id');
    }
    return toStoredFile(response.data);
  }

  /** `files.copy`: the copy happens inside Drive and is independent of the original (CA-40.6). */
  async copyFile(copy: FileCopy): Promise<StoredFile> {
    const response = await this.call(
      'copyFile',
      () =>
        this.drive.files.copy(
          { fileId: copy.fileId, requestBody: { name: copy.name, parents: [copy.parentId] }, fields: FILE_FIELDS },
          this.requestOptions,
        ),
      'The file to copy or the destination folder no longer exists in the storage',
    );
    if (!response.data.id) {
      throw new DocumentStorageUnavailableError('TRANSIENT', 'Drive answered without a file id');
    }
    return toStoredFile(response.data);
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.deleteById('deleteFile', fileId);
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const response = await this.call(
      'downloadFile',
      () =>
        this.drive.files.get(
          { fileId, alt: 'media' },
          { ...this.requestOptions, responseType: 'arraybuffer' },
        ),
      'The file no longer exists in the storage',
    );
    return Buffer.from(response.data as unknown as ArrayBuffer);
  }

  /**
   * The files directly in the folder, without subfolders and without the trash
   * (CA-38.3), every page of them. It needs the `drive.readonly` scope to see
   * what people uploaded by hand (C-24); with `drive.file` alone it sees only
   * what the app created. A folder that is gone has no files.
   */
  async listFiles(folderId: string): Promise<StoredDocument[]> {
    const query =
      `'${escapeQueryValue(folderId)}' in parents` +
      ' and trashed = false' +
      ` and mimeType != '${FOLDER_MIME_TYPE}'`;
    const documents: StoredDocument[] = [];
    let pageToken: string | undefined;
    try {
      do {
        const token = pageToken;
        const response = await this.call('listFiles', () =>
          this.drive.files.list(
            {
              q: query,
              pageSize: LIST_PAGE_SIZE,
              pageToken: token,
              fields: `nextPageToken, files(${DOCUMENT_FIELDS})`,
              spaces: 'drive',
            },
            this.requestOptions,
          ),
        );
        documents.push(...(response.data.files ?? []).filter((file) => file.id).map(toStoredDocument));
        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);
    } catch (error) {
      if (error instanceof FolderNotFound) {
        return [];
      }
      throw error;
    }
    return documents;
  }

  async findFile(fileId: string): Promise<StoredDocument | null> {
    try {
      const response = await this.call('findFile', () =>
        this.drive.files.get({ fileId, fields: `${DOCUMENT_FIELDS}, trashed` }, this.requestOptions),
      );
      const file = response.data;
      return file.trashed || !file.id || file.mimeType === FOLDER_MIME_TYPE ? null : toStoredDocument(file);
    } catch (error) {
      if (error instanceof FolderNotFound) {
        return null;
      }
      throw error;
    }
  }

  /** `files.export`: a native document converted by Drive (HU38, a Google document as PDF). */
  async exportFile(fileId: string, mimeType: string): Promise<Buffer> {
    const response = await this.call(
      'exportFile',
      () =>
        this.drive.files.export(
          { fileId, mimeType },
          { ...this.requestOptions, responseType: 'arraybuffer' },
        ),
      'The file no longer exists in the storage',
    );
    return Buffer.from(response.data as unknown as ArrayBuffer);
  }

  /**
   * A Word file converted to PDF by Drive (HU25, D-102). Drive only exports its
   * own documents, so the file is first copied as a Google document (`files.copy`
   * with that type converts it), the copy is exported to PDF, and the copy is
   * deleted **always**, even if the export failed: nothing is left behind
   * (CA-25.8). The copy goes to the root of the account, never to the folder of
   * the case, so it never shows in its document list.
   */
  async convertToPdf(fileId: string): Promise<Buffer> {
    const copy = await this.call(
      'convertToPdf',
      () =>
        this.drive.files.copy(
          {
            fileId,
            requestBody: { name: `vz-conversion-${fileId}`, mimeType: GOOGLE_DOCUMENT_MIME_TYPE },
            fields: 'id',
          },
          this.requestOptions,
        ),
      'The file to convert no longer exists in the storage',
    );
    const copyId = copy.data.id;
    if (!copyId) {
      throw new DocumentStorageUnavailableError('TRANSIENT', 'Drive answered without a file id');
    }
    try {
      return await this.exportFile(copyId, PDF_MIME_TYPE);
    } finally {
      await this.deleteById('deleteConversionCopy', copyId).catch((error: unknown) => {
        // The PDF is already in hand or the export already failed: a leftover copy is logged, not thrown.
        this.logger.warn(`Drive conversion copy ${copyId} could not be deleted: ${String(error)}`);
      });
    }
  }

  /** A file or folder that is already gone counts as deleted. */
  private async deleteById(operation: string, id: string): Promise<void> {
    try {
      await this.call(operation, () =>
        this.drive.files.delete({ fileId: id }, this.requestOptions),
      );
    } catch (error) {
      if (!(error instanceof FolderNotFound)) {
        throw error;
      }
    }
  }

  /**
   * Runs a Drive call with retries and turns its failure into a domain error.
   * A 404 becomes {@link FolderNotFound} when `missingMessage` is not given (the
   * caller decides what it means), or a `CONFIGURATION` storage error with that
   * message when it is (something we configured is no longer there).
   */
  private async call<T>(operation: string, work: () => Promise<T>, missingMessage?: string): Promise<T> {
    try {
      return await withDriveRetries(operation, work, this.sleep, this.logger);
    } catch (error) {
      const failure = classifyDriveError(error);
      this.logger.error(`Drive ${operation} failed: ${failure.detail}`);
      if (failure.notFound) {
        if (missingMessage) {
          throw new DocumentStorageUnavailableError('CONFIGURATION', missingMessage);
        }
        throw new FolderNotFound();
      }
      throw new DocumentStorageUnavailableError(
        failure.authorization ? 'AUTHORIZATION' : 'TRANSIENT',
        failure.detail,
      );
    }
  }
}

/** Internal: a 404 on a lookup or a delete, which the calling method interprets. */
class FolderNotFound extends Error {}

function toStoredFolder(file: drive_v3.Schema$File): StoredFolder {
  const id = file.id as string;
  return { id, url: file.webViewLink ?? `https://drive.google.com/drive/folders/${id}` };
}

function toStoredFile(file: drive_v3.Schema$File): StoredFile {
  const id = file.id as string;
  return { id, url: file.webViewLink ?? `https://drive.google.com/file/d/${id}/view` };
}

function toStoredDocument(file: drive_v3.Schema$File): StoredDocument {
  const id = file.id as string;
  const createdAt = new Date(file.createdTime as string);
  return {
    id,
    name: file.name ?? '',
    mimeType: file.mimeType ?? 'application/octet-stream',
    // Drive sends the size as a string, and none for its native documents.
    sizeBytes: file.size ? Number(file.size) : null,
    createdAt,
    modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : createdAt,
    uploadedBy: file.owners?.[0]?.displayName ?? null,
    url: file.webViewLink ?? `https://drive.google.com/file/d/${id}/view`,
    parentIds: file.parents ?? [],
  };
}

/** Escapes a value for a Drive search query (`q`), which is quoted with single quotes. */
export function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
