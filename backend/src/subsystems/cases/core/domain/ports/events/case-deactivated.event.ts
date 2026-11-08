import { IntegrationEvent } from '@shared/infrastructure/events/integration-event';

/** Versioned type of {@link CaseDeactivatedEvent}. Subscribers import this constant, never a literal. */
export const CASE_DEACTIVATED = 'cases.case-deactivated.v1';

/**
 * A case was given de baja and it has its Drive folder (HU21). `cases` owns this
 * fact and defines how it is described; subscribers adapt to this contract.
 *
 * It exists so `documents` sends the case's folder to the Drive trash, with
 * what is inside it (D-104, revised). `cases` publishes it **after** the baja is
 * saved, and publishing never throws: if Drive is down the baja still stands
 * and the folder stays where it was. The folder is not deleted for good, so a
 * wrongly given baja can be undone by hand in Drive's trash.
 *
 * Carries only the case id: the folder is found by it, and `documents` needs
 * nothing else. Not published for a case whose folder was not created: there
 * is nothing to trash.
 */
export interface CaseDeactivatedEvent extends IntegrationEvent {
  readonly type: typeof CASE_DEACTIVATED;
  readonly caseId: number;
}
