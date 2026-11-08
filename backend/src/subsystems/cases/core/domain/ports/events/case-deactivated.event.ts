import { IntegrationEvent } from '@shared/infrastructure/events/integration-event';

/** Versioned type of {@link CaseDeactivatedEvent}. Subscribers import this constant, never a literal. */
export const CASE_DEACTIVATED = 'cases.case-deactivated.v1';

/**
 * A case was given de baja and it has its Drive folder (HU21). `cases` owns this
 * fact and defines how it is described; subscribers adapt to this contract.
 *
 * It exists so `documents` moves the case's folder to the `Papelera` folder,
 * with what is inside it (D-104, revised). `cases` publishes it **after** the
 * baja is saved, and publishing never throws: if Drive is down the baja still
 * stands and the folder stays where it was. The folder is not deleted, so a
 * wrongly given baja can be undone by moving it back by hand.
 *
 * Carries only the case id: the folder is found by it, and `documents` needs
 * nothing else. Not published for a case whose folder was not created: there
 * is nothing to move.
 */
export interface CaseDeactivatedEvent extends IntegrationEvent {
  readonly type: typeof CASE_DEACTIVATED;
  readonly caseId: number;
}
