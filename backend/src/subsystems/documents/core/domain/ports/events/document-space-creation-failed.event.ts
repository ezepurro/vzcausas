import { IntegrationEvent } from '@shared/infrastructure/events/integration-event';

/** Versioned type of {@link DocumentSpaceCreationFailedEvent}. */
export const DOCUMENT_SPACE_CREATION_FAILED = 'documents.document-space-creation-failed.v1';

/** Why the creation failed, classified so `cases` can decide what to show or retry. */
export type DocumentSpaceFailureReason =
  | 'TRANSIENT'
  | 'AUTHORIZATION'
  | 'INVALID_DATA'
  | 'CONFIGURATION'
  | 'INTERNAL';

/**
 * The cloud folder of a case could not be created. `cases` sets the case's
 * `folder_status` to `ERROR` and retries (automatically or by user action).
 */
export interface DocumentSpaceCreationFailedEvent extends IntegrationEvent {
  readonly type: typeof DOCUMENT_SPACE_CREATION_FAILED;
  readonly caseId: number;
  readonly reason: DocumentSpaceFailureReason;
  /** Short, non-sensitive description. */
  readonly detail: string;
  readonly causedByEventId?: string;
}
