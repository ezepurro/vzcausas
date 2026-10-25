import { IntegrationEvent } from '@shared/infrastructure/events/integration-event';

/** Versioned type of {@link CaseRegisteredEvent}. Subscribers import this constant, never a literal. */
export const CASE_REGISTERED = 'cases.case-registered.v1';

/**
 * A case was registered (HU18). `cases` owns this fact and defines how it is
 * described; subscribers adapt to this contract.
 *
 * It carries what subscribers need so they never have to query `cases`:
 * primitives only, no domain objects. `cases` publishes it **after** the
 * registration transaction commits, so a subscriber never reacts to a case
 * that was rolled back.
 *
 * Protocol that `cases` must follow so a case never gets two folders:
 * 1. `folder_status` is the gate. Publish only after moving it to `CREATING`
 *    with an atomic update (`UPDATE cases SET folder_status = 'CREATING' WHERE
 *    id = ? AND folder_status IS DISTINCT FROM 'CREATING' AND folder_status IS
 *    DISTINCT FROM 'CREATED'`) that affected one row. Two simultaneous
 *    requests then cannot both publish.
 * 2. On `DocumentSpaceAssigned`, store `cloud_folder_id` and set `CREATED`.
 *    `documents` finds a case's folder through that link.
 * 3. On `DocumentSpaceCreationFailed`, set `ERROR`.
 */
export interface CaseRegisteredEvent extends IntegrationEvent {
  readonly type: typeof CASE_REGISTERED;
  readonly caseId: number;
  /** Case caption (carátula). */
  readonly caption: string;
  /** Responsible lawyer. */
  readonly lawyer: {
    readonly id: number;
    readonly lastName: string;
    readonly firstName: string;
  };
  /** Jurisdiction (fuero) of the case. */
  readonly jurisdiction: {
    readonly id: number;
    /** Display label, e.g. `Penal`. */
    readonly label: string;
  };
  /**
   * Also copy into the folder the formal templates of the jurisdiction (HU40).
   * `documents` then runs `CopyTemplatesToCaseFolder` after creating the folder,
   * and announces `CaseTemplatesCopied`. Added to `v1` as a required field: the
   * only subscriber is `documents`, which ships in the same change.
   */
  readonly copyTemplates: boolean;
}
