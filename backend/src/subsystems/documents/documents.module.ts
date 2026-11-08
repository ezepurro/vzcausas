import { Module } from '@nestjs/common';
import { ClockModule } from '@shared/infrastructure/clock/clock.module';
import { FolderChain } from './core/application/common/folder-chain';
import { AssureSpace } from './core/application/use-cases/assure-space.use-case';
import { SyncCaseFolder } from './core/application/use-cases/sync-case-folder.use-case';
import { CopyTemplatesToCaseFolder } from './core/application/use-cases/copy-templates-to-case-folder.use-case';
import { DownloadDocumentTemplate } from './core/application/use-cases/download-document-template.use-case';
import { GetDocumentTemplate } from './core/application/use-cases/get-document-template.use-case';
import { ListDocumentTemplates } from './core/application/use-cases/list-document-templates.use-case';
import { RegisterDocumentTemplate } from './core/application/use-cases/register-document-template.use-case';
import { SetupCloudStorage } from './core/application/use-cases/setup-cloud-storage.use-case';
import { GenerateCoverPdf } from './core/application/use-cases/generate-cover-pdf.use-case';
import { DownloadFolderDocument } from './core/application/use-cases/download-folder-document.use-case';
import { GenerateCaseFile } from './core/application/use-cases/generate-case-file.use-case';
import { CASE_FILE_PDF_COMPOSER } from './core/domain/ports/case-file-pdf-composer.port';
import { PdfLibCaseFileComposer } from './infrastructure/pdf/pdf-lib-case-file.composer';
import { ListFolderDocuments } from './core/application/use-cases/list-folder-documents.use-case';
import { CASE_FILE_REPOSITORY } from './core/domain/ports/case-file.repository';
import { PrismaCaseFileRepository } from './infrastructure/persistence/prisma/prisma-case-file.repository';
import { CLOUD_FOLDER_REPOSITORY } from './core/domain/ports/cloud-folder.repository';
import { COVER_PDF_RENDERER } from './core/domain/ports/cover-pdf-renderer.port';
import { PdfLibCoverRenderer } from './infrastructure/pdf/pdf-lib-cover.renderer';
import { DOCUMENT_TEMPLATE_REPOSITORY } from './core/domain/ports/document-template.repository';
import { TEMPLATE_COPY_REPOSITORY } from './core/domain/ports/template-copy.repository';
import { CaseRegisteredListener } from './infrastructure/acl/events/case-registered.listener';
import { CaseModifiedListener } from './infrastructure/acl/events/case-modified.listener';
import { CaseTemplatesCopyRequestedListener } from './infrastructure/acl/events/case-templates-copy-requested.listener';
import { DocumentTemplatesController } from './infrastructure/http/controllers/document-templates.controller';
import { DocumentTemplateHttpMapper } from './infrastructure/http/mappers/document-template-http.mapper';
import { PrismaCloudFolderRepository } from './infrastructure/persistence/prisma/prisma-cloud-folder.repository';
import { PrismaDocumentTemplateRepository } from './infrastructure/persistence/prisma/prisma-document-template.repository';
import { PrismaTemplateCopyRepository } from './infrastructure/persistence/prisma/prisma-template-copy.repository';
import { StorageBootstrap } from './infrastructure/bootstrap/storage-bootstrap';
import { DOCUMENT_STORAGE_PROVIDER } from './infrastructure/storage/document-storage.factory';

/**
 * Composition root of `documents`. It talks to the rest of the system through
 * integration events only: it listens to `CaseRegistered`, `CaseModified` (HU19: the
 * folder follows the case) and `CaseTemplatesCopyRequested` and announces `DocumentSpaceAssigned` /
 * `DocumentSpaceCreationFailed` / `CaseTemplatesCopied`. The one exception is
 * `GenerateCoverPdf` (HU24, P-08 option B): `cases` needs the PDF back, which an
 * event cannot carry, so it is exported and `cases` calls it through an ACL adapter.
 * `ListFolderDocuments` and `DownloadFolderDocument` (HU38) go the same way: `cases`
 * owns `/cases/{caseId}/documents` and asks `documents` for the files of the folder.
 * So does `GenerateCaseFile` (HU25): `cases` owns `/cases/{caseId}/case-files`,
 * draws the cover sheet and asks `documents` to join, number and save the case file.
 * Its one HTTP resource is `/document-templates` (HU34 and HU35).
 *
 * The listeners MUST stay in `providers`: if one is missing it never runs and
 * Nest reports no error.
 *
 * `DOCUMENT_STORAGE` is chosen when the app starts (see `createDocumentStorage`):
 * Google Drive if the `GOOGLE_OAUTH_*` variables are set, the in-memory storage
 * if they are not (never in production, where the app refuses to start).
 *
 * `SetupCloudStorage` creates the study's base folders. `StorageBootstrap` runs
 * it when the app starts, `AssureSpace` and `RegisterDocumentTemplate` when they
 * find the structure missing, and the command `npm run documents:setup-storage`
 * by hand.
 *
 * `ClockModule` provides the `CLOCK` token; `EventPublisher` is global.
 */
@Module({
  imports: [ClockModule],
  controllers: [DocumentTemplatesController],
  providers: [
    FolderChain,
    AssureSpace,
    SyncCaseFolder,
    SetupCloudStorage,
    CopyTemplatesToCaseFolder,
    CaseRegisteredListener,
    CaseModifiedListener,
    CaseTemplatesCopyRequestedListener,
    StorageBootstrap,
    RegisterDocumentTemplate,
    ListDocumentTemplates,
    GetDocumentTemplate,
    DownloadDocumentTemplate,
    DocumentTemplateHttpMapper,
    // HU24: draws the cover sheet that `cases` asks for (P-08 option B).
    GenerateCoverPdf,
    { provide: COVER_PDF_RENDERER, useClass: PdfLibCoverRenderer },
    // HU38: the files of a case folder, for `cases`. `case_files` is only read here.
    ListFolderDocuments,
    DownloadFolderDocument,
    { provide: CASE_FILE_REPOSITORY, useClass: PrismaCaseFileRepository },
    // HU25: the case file. `case_files` is written here; the PDF is joined with the cover's library.
    GenerateCaseFile,
    { provide: CASE_FILE_PDF_COMPOSER, useClass: PdfLibCaseFileComposer },
    { provide: CLOUD_FOLDER_REPOSITORY, useClass: PrismaCloudFolderRepository },
    { provide: DOCUMENT_TEMPLATE_REPOSITORY, useClass: PrismaDocumentTemplateRepository },
    { provide: TEMPLATE_COPY_REPOSITORY, useClass: PrismaTemplateCopyRepository },
    DOCUMENT_STORAGE_PROVIDER,
  ],
  exports: [GenerateCoverPdf, ListFolderDocuments, DownloadFolderDocument, GenerateCaseFile],
})
export class DocumentsModule {}
