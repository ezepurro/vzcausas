import { JurisdictionCode } from '../value-objects/jurisdiction-code';

/**
 * Same literals as the `notification_kind` enum of `sent_notifications`
 * (`docs/support/cambios-bdd-sprint3.md:248`). No translation layer between
 * what HU51/HU52 detect and what this subsystem persists.
 */
export type NotificationKind =
  | 'DEADLINE_WARNING'
  | 'DEADLINE_DUE_TODAY'
  | 'PRESCRIPTION_ALERT'
  | 'PRESCRIPTION_EXPIRED';

/**
 * What HU51 (detection, owned by another team member) hands over for one
 * upcoming or due-today deadline.
 *
 * Shape adopted as a working hypothesis (N-11, `IMPLEMENTACION_NOTIFICACIONES.md`),
 * not a closed agreement with the detection side — `.claude/rules/notificaciones.md`
 * has the full rationale. Expect this to change if the teammate proposes a
 * different shape when HU51 is written.
 */
export interface UpcomingDeadlineNotice {
  caseId: number;
  /** Carátula, for the email body. */
  caption: string;
  sacNumber: string | null;
  jurisdiction: JurisdictionCode;
  /** Resolved to an email by this subsystem (N-09), not by HU51. */
  responsibleLawyerId: number;
  kind: 'DEADLINE_WARNING' | 'DEADLINE_DUE_TODAY';
  /** Mirrors `deadline_kind`. */
  origin: 'PROCEDURAL_ACT' | 'HARMFUL_ACT';
  /** ISO date. Same value as `currentState.dueDate` or the amparo's harmful-act deadline (CA-30.10) — never recomputed here. */
  dueDate: string;
  /** The act that opened the deadline; `null` when `origin` is `HARMFUL_ACT`. */
  proceduralActId: number | null;
  /** Business days from today to `dueDate`, as HU51 classified it. Copied, never recomputed (D-72). */
  businessDaysRemaining: number;
}

/**
 * What HU52 (detection, owned by another team member) hands over for one
 * prescription alert or expiration.
 *
 * Same provisional-shape caveat as {@link UpcomingDeadlineNotice}.
 */
export interface PrescriptionNotice {
  caseId: number;
  caption: string;
  sacNumber: string | null;
  responsibleLawyerId: number;
  kind: 'PRESCRIPTION_ALERT' | 'PRESCRIPTION_EXPIRED';
  /** ISO date. The `prescriptionExpiresOn` of the legal qualification that governs (CA-32.1), never recomputed here. */
  referenceDate: string;
  /** So the email can say "por <calificación>", not just "prescribe" (CA-32.4). */
  legalQualificationName: string;
  /**
   * Calendar days from today to `referenceDate`. Copied, never recomputed
   * (D-72) — deliberately **not** `elapsedPercentage`: CA-22.3 keeps that
   * one out of anything the backend hands to a reader.
   */
  daysRemaining: number;
}
