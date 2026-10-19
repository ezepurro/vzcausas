import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { AssureSpace } from './core/application/use-cases/assure-space.use-case';
import { DownloadDocumentTemplate } from './core/application/use-cases/download-document-template.use-case';
import { GetDocumentTemplate } from './core/application/use-cases/get-document-template.use-case';
import { ListDocumentTemplates } from './core/application/use-cases/list-document-templates.use-case';
import { RegisterDocumentTemplate } from './core/application/use-cases/register-document-template.use-case';
import { CLOUD_FOLDER_REPOSITORY } from './core/domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE } from './core/domain/ports/document-storage.port';
import { DOCUMENT_TEMPLATE_REPOSITORY } from './core/domain/ports/document-template.repository';
import { CaseRegisteredListener } from './infrastructure/acl/events/case-registered.listener';
import { DocumentTemplatesController } from './infrastructure/http/controllers/document-templates.controller';
import { DocumentTemplateHttpMapper } from './infrastructure/http/mappers/document-template-http.mapper';
import { PrismaCloudFolderRepository } from './infrastructure/persistence/prisma/prisma-cloud-folder.repository';
import { PrismaDocumentTemplateRepository } from './infrastructure/persistence/prisma/prisma-document-template.repository';
import { InMemoryDocumentStorage } from './infrastructure/storage/in-memory/in-memory-document-storage';

/**
 * Composition root of `documents`. It talks to the rest of the system through
 * integration events only: it listens to `CaseRegistered` and announces
 * `DocumentSpaceAssigned` / `DocumentSpaceCreationFailed`, so it exports nothing.
 * Its one HTTP resource is `/document-templates` (HU34 and HU35).
 *
 * The listener MUST stay in `providers`: if it is missing it never runs and
 * Nest reports no error.
 *
 * TRANSITIONAL: `DOCUMENT_STORAGE` is bound to an in-memory storage until the
 * Google Drive adapter exists. For that reason this module is **not** imported
 * by `AppModule` yet: it must not run in production with a storage that
 * forgets everything.
 *
 * `SharedModule` provides the `CLOCK` token; `EventPublisher` is global.
 */
@Module({
  imports: [SharedModule],
  controllers: [DocumentTemplatesController],
  providers: [
    AssureSpace,
    CaseRegisteredListener,
    RegisterDocumentTemplate,
    ListDocumentTemplates,
    GetDocumentTemplate,
    DownloadDocumentTemplate,
    DocumentTemplateHttpMapper,
    { provide: CLOUD_FOLDER_REPOSITORY, useClass: PrismaCloudFolderRepository },
    { provide: DOCUMENT_TEMPLATE_REPOSITORY, useClass: PrismaDocumentTemplateRepository },
    { provide: DOCUMENT_STORAGE, useClass: InMemoryDocumentStorage },
  ],
})
export class DocumentsModule {}
