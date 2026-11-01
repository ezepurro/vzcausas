/** DI token for {@link AuditTrailPort}. */
export const AUDIT_TRAIL = Symbol("AUDIT_TRAIL");

/**
 * One business event worth keeping: who did what, to which entity, and when
 * (`AUDITORIA_Y_TRAZABILIDAD.md` §3; Ley 25.326, RN12).
 *
 * `metadata` carries **identifiers and the names of what changed, never the
 * values**: no personal data, no case content, no secrets (§4). The table is
 * append-only, so whatever goes in stays.
 */
export interface AuditEntry {
  /** The user who acted; `null` only when no user is behind it (the daily process). */
  actorUserId: number | null;
  /** `entity.verb-in-past-tense`: `lawyer.updated`, `case.deactivated`. */
  action: string;
  /** `Lawyer`, `Case`, `ProceduralAct`… */
  entityType: string;
  /** The entity's key, as text, so numeric and cloud ids fit alike. */
  entityId: string;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
  /** The request's `X-Correlation-Id`, to cross with the technical log. */
  correlationId?: string | null;
}

/**
 * The business audit trail: transversal, so it lives in `shared` and every
 * subsystem writes through it.
 *
 * Called **from the use case**, never from an HTTP interceptor: an interceptor
 * can only say "a PATCH arrived"; the use case knows "the administrator changed
 * the lawyer's registration number". Called inside the use case's transaction,
 * so the change and its record land together or not at all.
 */
export interface AuditTrailPort {
  record(entry: AuditEntry): Promise<void>;
}
