import { IntegrationEvent } from '@shared/infrastructure/events/integration-event';

/** Versioned type of {@link LawyerRenamedEvent}. Subscribers import this constant, never a literal. */
export const LAWYER_RENAMED = 'people.lawyer-renamed.v1';

/**
 * A lawyer's last name or first names changed (HU14). `people` owns this fact
 * and defines how it is described; subscribers adapt to this contract.
 *
 * It exists for D-104: the lawyer's folder in Drive is named after them
 * (`/VZ Causas/Causas/{Apellido, Nombres}`), so `documents` renames it when it
 * hears this (CA-14.12). `people` publishes it **after** the change is saved,
 * and publishing never throws: if Drive is down, the modification still
 * stands and the folder is corrected later (CA-14.13).
 *
 * Carries the new name, primitives only, so subscribers never query `people`.
 * Not published when only the registration number changed: the folder does
 * not carry it.
 */
export interface LawyerRenamedEvent extends IntegrationEvent {
  readonly type: typeof LAWYER_RENAMED;
  readonly lawyerId: number;
  readonly lastName: string;
  readonly firstName: string;
}
