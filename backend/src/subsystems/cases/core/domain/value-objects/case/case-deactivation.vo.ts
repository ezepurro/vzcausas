import { ValidationError } from '@shared/domain/domain-error';

const REASON_MAX = 500;
const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';

/** What the form of "Dar de baja" sends (contract V5 §3.7, `DELETE /cases/{caseId}`). */
export interface CaseDeactivationInput {
  reason?: string | null;
}

/** Who gives the case de baja and when. */
export interface CaseDeactivationContext {
  deactivatedByUserId: number;
  deactivatedAt: Date;
}

export interface CaseDeactivationProps {
  reason: string | null;
  deactivatedByUserId: number;
  deactivatedAt: Date;
}

/**
 * The record that a case was given de baja (HU21): who, when and the optional
 * reason (`deactivated_*` columns of `cases`).
 *
 * **A value object, not an entity.** It has no identity of its own — it is one
 * to one with its case and lives in its columns — and no life cycle: the API
 * never undoes a baja (D-97). What makes it valid is decided when it is built.
 *
 * The reason is kept with the case and not in `audit_log`: it is free text and
 * may hold sensitive data (AUDITORIA_Y_TRAZABILIDAD.md §4, CA-21.3).
 */
export class CaseDeactivation {
  private constructor(private readonly props: CaseDeactivationProps) {}

  /**
   * The reason is optional (CA-21.2): a missing or blank one is stored as
   * `null`, as `ck_cases_deactivation_reason_not_blank` requires. Up to 500
   * characters once trimmed.
   * @throws ValidationError
   */
  static create(input: CaseDeactivationInput, context: CaseDeactivationContext): CaseDeactivation {
    const reason = input.reason?.trim() || null;
    if (reason !== null && reason.length > REASON_MAX) {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, {
        reason: `Debe tener hasta ${REASON_MAX} caracteres.`,
      });
    }

    return new CaseDeactivation({
      reason,
      deactivatedByUserId: context.deactivatedByUserId,
      deactivatedAt: context.deactivatedAt,
    });
  }

  /** Rebuilds a deactivation from persisted data, without validation. */
  static hydrate(props: CaseDeactivationProps): CaseDeactivation {
    return new CaseDeactivation({ ...props });
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

  equals(other: CaseDeactivation): boolean {
    return (
      this.props.reason === other.props.reason &&
      this.props.deactivatedByUserId === other.props.deactivatedByUserId &&
      this.props.deactivatedAt.getTime() === other.props.deactivatedAt.getTime()
    );
  }
}
