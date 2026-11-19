import { IntegrationEvent } from "@shared/infrastructure/events/integration-event";

/** Versioned type of {@link LawyerDeactivatedEvent}. Subscribers import this constant, never a literal. */
export const LAWYER_DEACTIVATED = "people.lawyer-deactivated.v1";

/**
 * A lawyer was given de baja (HU15). `people` owns this fact and defines how it is described;
 * subscribers adapt to this contract.
 *
 * It exists for D-132: the lawyer's own folder in Drive (`/VZ Causas/Causas/{Apellido, Nombres}`)
 * goes to `Papelera` with what is inside, unless the lawyer keeps cases in a terminal state, in
 * which case it stays as their history. The folders of the active cases are moved by
 * `CaseModified`, not by this. `people` publishes it **after** the baja is saved, and publishing
 * never fails the request: if Drive is down the baja stands and the folder is corrected later.
 *
 * Primitives only, so subscribers never query `people`.
 */
export interface LawyerDeactivatedEvent extends IntegrationEvent {
  readonly type: typeof LAWYER_DEACTIVATED;
  readonly lawyerId: number;
  /**
   * The lawyer is still responsible for cases in a terminal state (D-143): their folder stays,
   * with those cases inside, as their history (D-132). `people` decides it, from `cases`, when the
   * baja is written: the listener cannot, because the folders of the active cases move at the same
   * time and in no fixed order.
   */
  readonly keepsHistory: boolean;
}
