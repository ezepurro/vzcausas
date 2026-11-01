import { IntegrationEvent } from '@shared/infrastructure/events/integration-event';

/** Versioned type of {@link CaseModifiedEvent}. Subscribers import this constant, never a literal. */
export const CASE_MODIFIED = 'cases.case-modified.v1';

/**
 * A case's caption or responsible lawyer changed, and the case has its Drive
 * folder (HU19). `cases` owns this fact and defines how it is described;
 * subscribers adapt to this contract.
 *
 * It exists for D-104: the folder is `Causas/{abogado}/{fuero}/{carátula}`,
 * so `documents` renames it when the caption changed and moves it under the
 * new lawyer, whose folders it creates if missing, when the responsible lawyer
 * changed (CA-19.9). `cases` publishes it **after** the modification is
 * saved, and publishing never throws: if Drive is down the modification still
 * stands, and `folder.path` keeps showing where the folder really is
 * (CA-19.10). `POST /cases/{caseId}/folder` or the daily process finish it.
 *
 * Carries the whole destination, not just what changed, so `documents` never
 * queries `cases`. Primitives only. Not published for a case whose folder was
 * not created: there is nothing to move.
 */
export interface CaseModifiedEvent extends IntegrationEvent {
  readonly type: typeof CASE_MODIFIED;
  readonly caseId: number;
  /** The caption the folder must be named after. */
  readonly caption: string;
  /** The responsible lawyer whose folder must hold it. */
  readonly lawyer: {
    readonly id: number;
    readonly lastName: string;
    readonly firstName: string;
  };
  /** The jurisdiction folder under the lawyer's: it never changes (D-95). */
  readonly jurisdiction: {
    readonly id: number;
    /** Display label, e.g. `Penal`. */
    readonly label: string;
  };
  /** What changed: `caption` renames the folder, `responsibleLawyer` moves it. */
  readonly changed: readonly ('caption' | 'responsibleLawyer')[];
}
