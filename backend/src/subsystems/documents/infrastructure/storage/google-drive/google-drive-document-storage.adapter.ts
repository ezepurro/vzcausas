import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthClientService } from '@shared/infrastructure/google/google-oauth-client.service';
import { drive_v3, google } from 'googleapis';
import { Readable } from 'node:stream';
import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';
import {
  DocumentStoragePort,
  FileUpload,
  FolderReference,
  StoredFile,
  StoredFolder,
} from '../../../core/domain/ports/document-storage.port';
import { classifyDriveError } from './drive-error.mapper';
import { withDriveRetries } from './drive-retry';

/** The only part of the Drive client this adapter uses: a test passes a fake with just this. */
export type DriveFilesClient = Pick<drive_v3.Drive, 'files'>;

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const DEFAULT_TIMEOUT_MS = 15_000;
const FILE_FIELDS = 'id, webViewLink';

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
 *   `googleapis` library leaves this class.
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
   * Options for every call. `retry: false` turns off the retries `googleapis`
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
    this.drive = driveClient ?? google.drive({ version: 'v3', auth: oauth.getClient() });
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

/** Escapes a value for a Drive search query (`q`), which is quoted with single quotes. */
export function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
