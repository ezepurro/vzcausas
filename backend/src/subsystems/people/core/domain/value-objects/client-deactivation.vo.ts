import { ValidationError } from "@shared/domain/domain-error";

const REASON_MAX = 500;
const INVALID_DATA_MESSAGE = "Los datos enviados no son válidos.";

/** What the "Eliminar cliente" form sends (contract V6 §3.6, `DELETE /clients/{clientId}`). */
export interface ClientDeactivationInput {
  reason?: string | null;
}

/** Who gives the client de baja and when. */
export interface ClientDeactivationContext {
  deactivatedByUserId: number;
  deactivatedAt: Date;
}

export interface ClientDeactivationProps {
  reason: string | null;
  deactivatedByUserId: number;
  deactivatedAt: Date;
}

/**
 * The record that a client was given de baja (HU11): who, when and the
 * optional reason (`deactivated_*` columns of `clients`, D-122).
 *
 * **A value object, not an entity.** It has no identity of its own — it is one
 * to one with its client and lives in its columns — and no life cycle: the
 * API never undoes a baja. What makes it valid is decided when it is built.
 *
 * The reason is kept with the client and not in `audit_log`: it is free text
 * and may hold sensitive data (AUDITORIA_Y_TRAZABILIDAD.md §4, CA-11.5).
 * Same shape as `cases`' `CaseDeactivation`, which `people` cannot import.
 */
export class ClientDeactivation {
  private constructor(private readonly props: ClientDeactivationProps) {}

  /**
   * The reason is optional (CA-11.7): a missing or blank one is stored as
   * `null`, as `ck_clients_deactivation_reason_not_blank` requires. Up to 500
   * characters once trimmed.
   * @throws {ValidationError}
   */
  static create(input: ClientDeactivationInput, context: ClientDeactivationContext): ClientDeactivation {
    const reason = input.reason?.trim() || null;
    if (reason !== null && reason.length > REASON_MAX) {
      throw new ValidationError("VALIDATION_ERROR", INVALID_DATA_MESSAGE, {
        reason: `Debe tener hasta ${REASON_MAX} caracteres.`,
      });
    }
    return new ClientDeactivation({
      reason,
      deactivatedByUserId: context.deactivatedByUserId,
      deactivatedAt: context.deactivatedAt,
    });
  }

  /** Rebuilds a deactivation from persisted data, without validation. */
  static hydrate(props: ClientDeactivationProps): ClientDeactivation {
    return new ClientDeactivation({ ...props });
  }

  get reason(): string | null {
    return this.props.reason;
  }

  get deactivatedByUserId(): number {
    return this.props.deactivatedByUserId;
  }

  get deactivatedAt(): Date {
    return this.props.deactivatedAt;
  }

  equals(other: ClientDeactivation): boolean {
    return (
      this.props.reason === other.props.reason &&
      this.props.deactivatedByUserId === other.props.deactivatedByUserId &&
      this.props.deactivatedAt.getTime() === other.props.deactivatedAt.getTime()
    );
  }
}
