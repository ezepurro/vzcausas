import { IntegrationEvent } from '@shared/infrastructure/events/integration-event';

/** Versioned type of {@link CaseTemplatesCopiedEvent}. */
export const CASE_TEMPLATES_COPIED = 'documents.case-templates-copied.v1';

/**
 * An attempt to copy the formal templates into a case's folder ended (HU40).
 * Published also when some templates failed: `pending` says how many are left,
 * and the caller can try again. It carries the folder so `cases` can make sure
 * it is linked even if this reaches it before `DocumentSpaceAssigned`.
 */
export interface CaseTemplatesCopiedEvent extends IntegrationEvent {
  readonly type: typeof CASE_TEMPLATES_COPIED;
  readonly caseId: number;
  readonly cloudFolderId: string;
  /** Templates copied into the folder so far. */
  readonly copied: number;
  /** Templates asked for and not copied yet. */
  readonly pending: number;
  /** `eventId` of the event that triggered this work, if any. */
  readonly causedByEventId?: string;
}
