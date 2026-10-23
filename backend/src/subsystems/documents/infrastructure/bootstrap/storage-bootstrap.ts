import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SetupCloudStorage } from '../../core/application/use-cases/setup-cloud-storage.use-case';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from '../storage/in-memory/in-memory-document-storage';

/**
 * Sets up the study's base folders in the cloud when the app starts, so nobody
 * has to remember `npm run documents:setup-storage` (ADR-003 §2.6).
 *
 * It never stops the app: if Drive is down or the authorization is lost, the
 * failure is logged and the server starts anyway; `AssureSpace` and
 * `RegisterDocumentTemplate` set the structure up later, when they need it.
 *
 * It does nothing with the in-memory storage (it would register folders that
 * live only in this process) or with `DOCUMENTS_AUTO_SETUP=false`. It runs in
 * `onApplicationBootstrap`, not `onModuleInit`, so Prisma and the Google client
 * are already built.
 */
@Injectable()
export class StorageBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(StorageBootstrap.name);

  constructor(
    private readonly setup: SetupCloudStorage,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('DOCUMENTS_AUTO_SETUP') === 'false') {
      this.logger.log('DOCUMENTS_AUTO_SETUP=false: the base folders are not set up at startup.');
      return;
    }
    if (this.storage instanceof InMemoryDocumentStorage) {
      return;
    }
    try {
      await this.setup.execute();
    } catch (error) {
      this.logger.error(
        `Could not set up the base folders at startup; they will be set up when needed: ${String(error)}`,
      );
    }
  }
}
