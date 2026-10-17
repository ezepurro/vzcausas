import { Module } from '@nestjs/common';
import { CASE_FOLDER } from '@subsystems/cases/core/domain/ports/case-folder.port';
import { SharedModule } from '@shared/shared.module';
import { AssureSpace } from './core/application/use-cases/assure-space.use-case';
import { CLOUD_FOLDER_REPOSITORY } from './core/domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE } from './core/domain/ports/document-storage.port';
import { CasesCaseFolderAdapter } from './infrastructure/acl/cases-case-folder.adapter';
import { PrismaCloudFolderRepository } from './infrastructure/persistence/prisma/prisma-cloud-folder.repository';
import { InMemoryDocumentStorage } from './infrastructure/storage/in-memory/in-memory-document-storage';

/**
 * Composition root of `documents`. `exports` is its public surface: only the
 * `CASE_FOLDER` adapter that `cases` uses.
 *
 * TRANSITIONAL: `DOCUMENT_STORAGE` is bound to an in-memory storage until the
 * Google Drive adapter exists. For that reason this module is **not** imported
 * by `AppModule` yet: it must not run in production with a storage that
 * forgets everything.
 *
 * `SharedModule` provides the `CLOCK` token.
 */
@Module({
  imports: [SharedModule],
  providers: [
    AssureSpace,
    { provide: CLOUD_FOLDER_REPOSITORY, useClass: PrismaCloudFolderRepository },
    { provide: DOCUMENT_STORAGE, useClass: InMemoryDocumentStorage },
    // Adapter of the port that `cases` defines to ask for a case's folder.
    { provide: CASE_FOLDER, useClass: CasesCaseFolderAdapter },
  ],
  exports: [CASE_FOLDER],
})
export class DocumentsModule {}
