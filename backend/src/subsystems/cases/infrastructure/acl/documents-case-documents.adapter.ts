import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { DownloadFolderDocument } from '@subsystems/documents/core/application/use-cases/download-folder-document.use-case';
import { GenerateCaseFile as GenerateCaseFileInDocuments } from '@subsystems/documents/core/application/use-cases/generate-case-file.use-case';
import {
  FolderDocumentResult,
  ListFolderDocuments,
} from '@subsystems/documents/core/application/use-cases/list-folder-documents.use-case';
import {
  CaseDocumentFile,
  CaseDocumentItem,
  CaseDocumentsPort,
  GenerateCaseFileInput,
  GeneratedCaseFile,
} from '../../core/domain/ports/case/case-documents.port';

/**
 * Implements the {@link CaseDocumentsPort} that `cases` declares by calling the
 * use cases `documents` exports (HU38, `ARQUITECTURA_BACKEND_V1.md` §6.2), as
 * `DocumentsCoverPdfAdapter` does for the cover sheet.
 *
 * **Only translates** `documents`' results into `cases`' types, field by field,
 * so a change on either side stops compiling here. It catches nothing: the
 * errors of `documents` reach the client as they are.
 */
@Injectable()
export class DocumentsCaseDocumentsAdapter implements CaseDocumentsPort {
  constructor(
    private readonly listFolderDocuments: ListFolderDocuments,
    private readonly downloadFolderDocument: DownloadFolderDocument,
    private readonly generateCaseFileInDocuments: GenerateCaseFileInDocuments,
  ) {}

  async list(cloudFolderId: string): Promise<CaseDocumentItem[]> {
    const documents = await this.listFolderDocuments.execute({ folderId: cloudFolderId });
    return documents.map(toItem);
  }

  async download(cloudFolderId: string, documentId: string, actor: AuthenticatedUser): Promise<CaseDocumentFile> {
    const file = await this.downloadFolderDocument.execute({ folderId: cloudFolderId, documentId, actor });
    return { fileName: file.fileName, mimeType: file.mimeType, content: file.content };
  }

  async generateCaseFile(input: GenerateCaseFileInput): Promise<GeneratedCaseFile> {
    const result = await this.generateCaseFileInDocuments.execute({
      caseId: input.caseId,
      sacNumber: input.sacNumber,
      folderId: input.cloudFolderId,
      coverPdf: input.coverPdf,
      documentIds: input.documentIds,
      generatedByUserId: input.actor.userId,
    });
    return {
      document: toItem(result.document),
      version: result.version,
      pageCount: result.pageCount,
      parts: result.parts.map((part) => ({
        position: part.position,
        kind: part.kind,
        documentId: part.documentId,
        name: part.name,
      })),
      generatedBy: {
        id: result.generatedBy.id,
        lastName: result.generatedBy.lastName,
        firstName: result.generatedBy.firstName,
      },
      generatedAt: result.generatedAt,
    };
  }
}

/** A document of `documents` in `cases`' type, field by field. */
function toItem(document: FolderDocumentResult): CaseDocumentItem {
  return {
    id: document.id,
    name: document.name,
    extension: document.extension,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    createdAt: document.createdAt,
    modifiedAt: document.modifiedAt,
    uploadedBy: document.uploadedBy,
    url: document.url,
    convertibleToPdf: document.convertibleToPdf,
    caseFile: document.caseFile && { id: document.caseFile.id, version: document.caseFile.version },
  };
}
