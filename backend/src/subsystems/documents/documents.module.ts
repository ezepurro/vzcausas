import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { AssureSpace } from './core/application/use-cases/assure-space.use-case';
import { CLOUD_FOLDER_REPOSITORY } from './core/domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE } from './core/domain/ports/document-storage.port';
import { CaseRegisteredListener } from './infrastructure/acl/events/case-registered.listener';
import { PrismaCloudFolderRepository } from './infrastructure/persistence/prisma/prisma-cloud-folder.repository';
import { InMemoryDocumentStorage } from './infrastructure/storage/in-memory/in-memory-document-storage';

/**
 * Composition root of `documents`. It talks to the rest of the system through
 * integration events only: it listens to `CaseRegistered` and announces
 * `DocumentSpaceAssigned` / `DocumentSpaceCreationFailed`, so it exports nothing.
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
  providers: [
    AssureSpace,
    CaseRegisteredListener,
    { provide: CLOUD_FOLDER_REPOSITORY, useClass: PrismaCloudFolderRepository },
    { provide: DOCUMENT_STORAGE, useClass: InMemoryDocumentStorage },
  ],
})
export class DocumentsModule {}
