import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CaseDocument, CaseDocumentSnapshot, PDF_MIME_TYPE } from '../../domain/entities/case-document.entity';
import { CaseFile } from '../../domain/entities/case-file.entity';
import {
  CaseFileStorageUnavailableError,
  CaseFileVersionTakenError,
  DocumentStorageUnavailableError,
} from '../../domain/errors/documents.errors';
import { CASE_FILE_REPOSITORY, CaseFileRepository } from '../../domain/ports/case-file.repository';
import {
  CASE_FILE_PDF_COMPOSER,
  CaseFilePdfComposer,
  CaseFilePdfPart,
} from '../../domain/ports/case-file-pdf-composer.port';
import { DOCUMENT_STORAGE, DocumentStoragePort, StoredDocument } from '../../domain/ports/document-storage.port';
import { CaseFileComposition, CaseFilePart } from '../../domain/value-objects/case-file-composition.vo';

/** How many times a version taken by a simultaneous generation is retried with the next one. */
const SAVE_ATTEMPTS = 3;

/** What `cases` hands over: the case only as ids and its SAC, and the cover sheet already drawn. */
export interface GenerateCaseFileCommand {
  caseId: number;
  /** For the file name; `null` when the case has none. */
  sacNumber: string | null;
  /** The folder of the case, `CREATED`: `cases` checked it. */
  folderId: string;
  /** The cover sheet, one PDF page drawn by `GenerateCoverPdf` (D-94). */
  coverPdf: Uint8Array;
  /** At least one and none repeated: `cases` checked the shape. In the order of the case file. */
  documentIds: readonly string[];
  generatedByUserId: number;
}

/** The case file generated, as `cases` receives it: plain data, not entities (§6.3). */
export interface GeneratedCaseFileResult {
  /** The PDF saved in the folder, as the document list shows it, with its `caseFile`. */
  document: CaseDocumentSnapshot;
  version: number;
  pageCount: number;
  parts: CaseFilePart[];
  generatedBy: { id: number; lastName: string; firstName: string };
  generatedAt: Date;
}

/**
 * HU25: generates the case file (expediente) of a case — the cover sheet and the
 * chosen documents of its folder, in order, joined in one PDF — and saves it as a
 * new version in the folder and in `case_files` (D-102).
 *
 * Exported for `cases`, which owns `POST /cases/{caseId}/case-files` and calls it
 * through its ACL adapter (`ARQUITECTURA_BACKEND_V1.md` §6.2). It knows nothing of
 * cases: the cover sheet arrives drawn.
 *
 * **Nothing is left half done (CA-25.8).** The documents are validated before any
 * content is read; a failure reading them saves nothing. Once the PDF is uploaded,
 * any failure deletes it again, and the version is only used up when its row is
 * saved — so a file deleted by hand in the storage never frees its number (CA-25.6).
 */
@Injectable()
export class GenerateCaseFile {
  private readonly logger = new Logger(GenerateCaseFile.name);

  constructor(
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    @Inject(CASE_FILE_REPOSITORY) private readonly caseFiles: CaseFileRepository,
    @Inject(CASE_FILE_PDF_COMPOSER) private readonly composer: CaseFilePdfComposer,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /**
   * @throws {CaseFileDocumentsInvalidError} 400: a document is not in the folder or is a case file (CA-25.3).
   * @throws {DocumentNotConvertibleError} 422 (CA-25.4).
   * @throws {CaseFileStorageUnavailableError} 502: the storage failed reading or saving (CA-25.8).
   */
  async execute(command: GenerateCaseFileCommand): Promise<GeneratedCaseFileResult> {
    const composition = await this.compositionOf(command);

    const parts: CaseFilePdfPart[] = [{ kind: 'PDF', content: command.coverPdf }];
    for (const document of composition.documents) {
      parts.push(await this.unlessUnavailable(() => this.pdfPartOf(document)));
    }
    const composed = await this.composer.compose(parts);
    const generatedAt = this.clock.now();

    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.save(command, composition, composed, generatedAt);
      } catch (error) {
        if (error instanceof CaseFileVersionTakenError && attempt < SAVE_ATTEMPTS) {
          continue;
        }
        throw error;
      }
    }
  }

  /** The chosen documents as the storage has them, checked before any content is read. */
  private async compositionOf(command: GenerateCaseFileCommand): Promise<CaseFileComposition> {
    const stored = await this.unlessUnavailable(() =>
      Promise.all(command.documentIds.map((id) => this.storage.findFile(id))),
    );
    const existing = stored.filter((file): file is StoredDocument => file !== null);
    const caseFiles = await this.caseFiles.findByCloudFileIds(existing.map((file) => file.id));
    const found = new Map(
      existing.map((file) => [file.id, CaseDocument.fromStorage(file, caseFiles.get(file.id) ?? null)]),
    );
    return CaseFileComposition.create({ folderId: command.folderId, documentIds: command.documentIds, found });
  }

  /** The document as a piece of the case file, read the way its type needs (D-102). */
  private async pdfPartOf(document: CaseDocument): Promise<CaseFilePdfPart> {
    switch (document.pdfConversion) {
      case 'EXPORT':
        return { kind: 'PDF', content: await this.storage.exportFile(document.id, PDF_MIME_TYPE) };
      case 'CONVERT':
        return { kind: 'PDF', content: await this.storage.convertToPdf(document.id) };
      case 'IMAGE':
        return {
          kind: 'IMAGE',
          mimeType: document.mimeType as 'image/jpeg' | 'image/png',
          content: await this.storage.downloadFile(document.id),
        };
      default:
        // `AS_IS`: the composition already turned away what cannot be converted.
        return { kind: 'PDF', content: await this.storage.downloadFile(document.id) };
    }
  }

  /**
   * One attempt at saving: next version, upload, read back what the storage saved,
   * and the row. If anything fails after the upload, the uploaded file is deleted.
   */
  private async save(
    command: GenerateCaseFileCommand,
    composition: CaseFileComposition,
    composed: { content: Buffer; pageCount: number },
    generatedAt: Date,
  ): Promise<GeneratedCaseFileResult> {
    const version = await this.caseFiles.nextVersion(command.caseId);
    const fileName = CaseFile.fileNameFor(command.sacNumber, command.caseId, version);
    const uploaded = await this.unlessUnavailable(() =>
      this.storage.uploadFile({
        parentId: command.folderId,
        name: fileName,
        mimeType: PDF_MIME_TYPE,
        content: composed.content,
      }),
    );

    try {
      const saved = await this.unlessUnavailable(() => this.storage.findFile(uploaded.id));
      if (saved === null) {
        throw new CaseFileStorageUnavailableError();
      }
      const caseFile = CaseFile.create({
        caseId: command.caseId,
        version,
        cloudFileId: uploaded.id,
        fileName,
        pageCount: composed.pageCount,
        generatedByUserId: command.generatedByUserId,
        generatedAt,
      });
      const row = await this.caseFiles.save(caseFile);

      return {
        document: CaseDocument.fromStorage(saved, { id: row.id, version }).snapshot(),
        version,
        pageCount: composed.pageCount,
        parts: composition.parts(),
        generatedBy: row.generatedBy,
        generatedAt,
      };
    } catch (error) {
      await this.discard(uploaded.id);
      throw error;
    }
  }

  /** Deletes an upload that will not be kept. If even that fails, the leftover is logged: the error that matters is the first one. */
  private async discard(fileId: string): Promise<void> {
    try {
      await this.storage.deleteFile(fileId);
    } catch (error) {
      this.logger.error(`Case file upload ${fileId} could not be deleted after a failure: ${String(error)}`);
    }
  }

  private async unlessUnavailable<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof DocumentStorageUnavailableError) {
        throw new CaseFileStorageUnavailableError();
      }
      throw error;
    }
  }
}
