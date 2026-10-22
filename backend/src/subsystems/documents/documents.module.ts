import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { AssureSpace } from './core/application/use-cases/assure-space.use-case';
import { CopyTemplatesToCaseFolder } from './core/application/use-cases/copy-templates-to-case-folder.use-case';
import { DownloadDocumentTemplate } from './core/application/use-cases/download-document-template.use-case';
import { GetDocumentTemplate } from './core/application/use-cases/get-document-template.use-case';
import { ListDocumentTemplates } from './core/application/use-cases/list-document-templates.use-case';
import { RegisterDocumentTemplate } from './core/application/use-cases/register-document-template.use-case';
import { SetupCloudStorage } from './core/application/use-cases/setup-cloud-storage.use-case';
import { CLOUD_FOLDER_REPOSITORY } from './core/domain/ports/cloud-folder.repository';
import { DOCUMENT_TEMPLATE_REPOSITORY } from './core/domain/ports/document-template.repository';
import { TEMPLATE_COPY_REPOSITORY } from './core/domain/ports/template-copy.repository';
import { CaseRegisteredListener } from './infrastructure/acl/events/case-registered.listener';
import { CaseTemplatesCopyRequestedListener } from './infrastructure/acl/events/case-templates-copy-requested.listener';
import { DocumentTemplatesController } from './infrastructure/http/controllers/document-templates.controller';
import { DocumentTemplateHttpMapper } from './infrastructure/http/mappers/document-template-http.mapper';
import { PrismaCloudFolderRepository } from './infrastructure/persistence/prisma/prisma-cloud-folder.repository';
import { PrismaDocumentTemplateRepository } from './infrastructure/persistence/prisma/prisma-document-template.repository';
import { PrismaTemplateCopyRepository } from './infrastructure/persistence/prisma/prisma-template-copy.repository';
import { DOCUMENT_STORAGE_PROVIDER } from './infrastructure/storage/document-storage.factory';

/**
 * Composition root of `documents`. It talks to the rest of the system through
 * integration events only: it listens to `CaseRegistered` and
 * `CaseTemplatesCopyRequested` and announces `DocumentSpaceAssigned` /
 * `DocumentSpaceCreationFailed` / `CaseTemplatesCopied`, so it exports nothing.
 * Its one HTTP resource is `/document-templates` (HU34 and HU35).
 *
 * The listeners MUST stay in `providers`: if one is missing it never runs and
 * Nest reports no error.
 *
 * `DOCUMENT_STORAGE` is chosen when the app starts (see `createDocumentStorage`):
 * Google Drive if the `GOOGLE_OAUTH_*` variables are set, the in-memory storage
 * if they are not (never in production, where the app refuses to start).
 *
 * `SetupCloudStorage` creates the study's base folders; the command
 * `npm run documents:setup-storage` runs it.
 *
 * `SharedModule` provides the `CLOCK` token; `EventPublisher` is global.
 */
@Module({
  imports: [SharedModule],
  controllers: [DocumentTemplatesController],
  providers: [
    AssureSpace,
    SetupCloudStorage,
    CopyTemplatesToCaseFolder,
    CaseRegisteredListener,
    CaseTemplatesCopyRequestedListener,
    RegisterDocumentTemplate,
    ListDocumentTemplates,
    GetDocumentTemplate,
    DownloadDocumentTemplate,
    DocumentTemplateHttpMapper,
    { provide: CLOUD_FOLDER_REPOSITORY, useClass: PrismaCloudFolderRepository },
    { provide: DOCUMENT_TEMPLATE_REPOSITORY, useClass: PrismaDocumentTemplateRepository },
    { provide: TEMPLATE_COPY_REPOSITORY, useClass: PrismaTemplateCopyRepository },
    DOCUMENT_STORAGE_PROVIDER,
  ],
})
export class DocumentsModule {}
