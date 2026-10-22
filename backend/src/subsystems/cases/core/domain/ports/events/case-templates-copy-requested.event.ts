import { IntegrationEvent } from '@shared/infrastructure/events/integration-event';

/** Versioned type of {@link CaseTemplatesCopyRequestedEvent}. Subscribers import this constant, never a literal. */
export const CASE_TEMPLATES_COPY_REQUESTED = 'cases.case-templates-copy-requested.v1';

/**
 * `cases` asks to copy the templates still pending into the folder of a case
 * that already has one (HU40, CA-40.7): the retry of a copy that failed halfway.
 * It is not published for a new case, whose request travels in
 * `CaseRegistered.copyTemplates`.
 *
 * Only the case: `documents` knows which copies are still pending, so the
 * retry copies just those and never repeats one.
 */
export interface CaseTemplatesCopyRequestedEvent extends IntegrationEvent {
  readonly type: typeof CASE_TEMPLATES_COPY_REQUESTED;
  readonly caseId: number;
}
