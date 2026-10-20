import { EventPublisher } from '@shared/infrastructure/events/event-publisher.port';
import { IntegrationEvent } from '@shared/infrastructure/events/integration-event';
import {
  CaseFolderStatePort,
  CaseFolderStatus,
  CaseFolderView,
} from '../domain/ports/case-folder-state.port';

/**
 * In-memory {@link CaseFolderStatePort}. A case it was not told about is
 * `PENDING`, which is how a case is born, and `null` stands for a case
 * registered before the folders existed.
 */
export class FakeCaseFolderState implements CaseFolderStatePort {
  private readonly statuses = new Map<number, CaseFolderStatus | null>();
  private readonly cloudFolderIds = new Map<number, string>();
  /** Every `startCreating` that was granted, in order. */
  readonly started: number[] = [];

  /** Puts a case in a given status, as if it had been left there. */
  set(caseId: number, status: CaseFolderStatus | null): void {
    this.statuses.set(caseId, status);
  }

  statusOf(caseId: number): CaseFolderStatus | null {
    return this.statuses.has(caseId) ? (this.statuses.get(caseId) as CaseFolderStatus | null) : 'PENDING';
  }

  cloudFolderIdOf(caseId: number): string | undefined {
    return this.cloudFolderIds.get(caseId);
  }

  async startCreating(caseId: number): Promise<boolean> {
    const status = this.statusOf(caseId);
    if (status !== null && status !== 'PENDING' && status !== 'ERROR') {
      return false;
    }
    this.statuses.set(caseId, 'CREATING');
    this.started.push(caseId);
    return true;
  }

  async markCreated(caseId: number, cloudFolderId: string): Promise<void> {
    this.statuses.set(caseId, 'CREATED');
    this.cloudFolderIds.set(caseId, cloudFolderId);
  }

  async markFailed(caseId: number): Promise<void> {
    if (this.statusOf(caseId) === 'CREATING') {
      this.statuses.set(caseId, 'ERROR');
    }
  }

  async find(caseId: number): Promise<CaseFolderView | null> {
    const status = this.statusOf(caseId);
    if (status === null) {
      return null;
    }
    const cloudFolderId = this.cloudFolderIds.get(caseId);
    return {
      status,
      url: status === 'CREATED' ? `https://storage.invalid/folders/${cloudFolderId}` : null,
      path: status === 'CREATED' ? '/VZ Causas/Ríos, Malena/Penal/CAUSA' : null,
      templatesCopied: 0,
      templatesPending: 0,
    };
  }
}

/**
 * Collects what a use case publishes. `onPublish` lets a spec play the part of
 * `documents`: it runs when the event is published and may answer it.
 */
export class FakeEventPublisher extends EventPublisher {
  readonly published: IntegrationEvent[] = [];
  onPublish: ((event: IntegrationEvent & { caseId: number }) => void | Promise<void>) | null = null;
  /** When set, `publish` fails with it. */
  failWith: Error | null = null;

  async publish(event: IntegrationEvent): Promise<void> {
    if (this.failWith) {
      throw this.failWith;
    }
    this.published.push(event);
    await this.onPublish?.(event as IntegrationEvent & { caseId: number });
  }
}
