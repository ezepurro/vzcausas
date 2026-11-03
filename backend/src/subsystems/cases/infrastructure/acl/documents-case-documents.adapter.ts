import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { DownloadFolderDocument } from '@subsystems/documents/core/application/use-cases/download-folder-document.use-case';
import { ListFolderDocuments } from '@subsystems/documents/core/application/use-cases/list-folder-documents.use-case';
import {
  CaseDocumentFile,
  CaseDocumentItem,
  CaseDocumentsPort,
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
  ) {}

  async list(cloudFolderId: string): Promise<CaseDocumentItem[]> {
    const documents = await this.listFolderDocuments.execute({ folderId: cloudFolderId });
    return documents.map((document) => ({
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
    }));
  }

  async download(cloudFolderId: string, documentId: string, actor: AuthenticatedUser): Promise<CaseDocumentFile> {
    const file = await this.downloadFolderDocument.execute({ folderId: cloudFolderId, documentId, actor });
    return { fileName: file.fileName, mimeType: file.mimeType, content: file.content };
  }
}
