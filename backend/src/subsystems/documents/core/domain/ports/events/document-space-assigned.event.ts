import { IntegrationEvent } from '@shared/infrastructure/events/integration-event';

/** Versioned type of {@link DocumentSpaceAssignedEvent}. */
export const DOCUMENT_SPACE_ASSIGNED = 'documents.document-space-assigned.v1';

/**
 * A case now has its cloud folder. Also published when the folder already
 * existed (idempotent repeat), so `cases` converges whoever asked. `cases`
 * stores `cloudFolderId` as the case's `cloud_folder_id` and sets
 * `folder_status` to `CREATED`.
 */
export interface DocumentSpaceAssignedEvent extends IntegrationEvent {
  readonly type: typeof DOCUMENT_SPACE_ASSIGNED;
  readonly caseId: number;
  readonly cloudFolderId: string;
  readonly url: string;
  /** Informational path; never use it to locate the folder. */
  readonly path: string;
  /** `eventId` of the event that triggered this work, if any (absent on a manual retry). */
  readonly causedByEventId?: string;
}
