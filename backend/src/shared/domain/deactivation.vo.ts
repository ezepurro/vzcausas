import { ValidationError } from '@shared/domain/domain-error';

const REASON_MAX = 500;
const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';

/**
 * What a "Dar de baja" form sends: the optional reason. `DELETE /cases/{caseId}`
 * (HU21, contract §3.7) and `DELETE /clients/{clientId}` (HU11, V6 §3.6).
 */
export interface DeactivationInput {
  reason?: string | null;
}

/** Who gives the record de baja and when. */
export interface DeactivationContext {
  deactivatedByUserId: number;
  deactivatedAt: Date;
}

export interface DeactivationProps {
  reason: string | null;
  deactivatedByUserId: number;
  deactivatedAt: Date;
}

/**
 * The record that something was given de baja (RN12): who, when and the
 * optional reason. Cases (HU21, D-97) and clients (HU11, D-122) keep it in
 * their `deactivated_*` columns; both follow the same rule, so the rule lives
 * once, in the shared kernel.
 *
 * **A value object, not an entity.** It has no identity of its own — it is one
 * to one with what was given de baja and lives in its columns — and no life
 * cycle: the API never undoes a baja. What makes it valid is decided when it
 * is built.
 *
 * The reason is kept with the record and not in `audit_log`: it is free text
 * and may hold sensitive data (AUDITORIA_Y_TRAZABILIDAD.md §4, CA-21.3, CA-11.5).
 */
export class Deactivation {
  private constructor(private readonly props: DeactivationProps) {}

  /**
   * The reason is optional (CA-21.2, CA-11.7): a missing or blank one is
   * stored as `null`, as the `ck_*_deactivation_reason_not_blank` checks
   * require. Up to 500 characters once trimmed.
   * @throws {ValidationError}
   */
  static create(input: DeactivationInput, context: DeactivationContext): Deactivation {
    const reason = input.reason?.trim() || null;
    if (reason !== null && reason.length > REASON_MAX) {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, {
        reason: `Debe tener hasta ${REASON_MAX} caracteres.`,
      });
    }

    return new Deactivation({
      reason,
      deactivatedByUserId: context.deactivatedByUserId,
      deactivatedAt: context.deactivatedAt,
    });
  }

  /** Rebuilds a deactivation from persisted data, without validation. */
  static hydrate(props: DeactivationProps): Deactivation {
    return new Deactivation({ ...props });
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

  equals(other: Deactivation): boolean {
    return (
      this.props.reason === other.props.reason &&
      this.props.deactivatedByUserId === other.props.deactivatedByUserId &&
      this.props.deactivatedAt.getTime() === other.props.deactivatedAt.getTime()
    );
  }
}
