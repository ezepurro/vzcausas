import { PrescriptionNotice } from './types/upcoming-deadline-notice';

/**
 * What the daily check (HU52) needs to know about a case's prescription to
 * decide which notice, if any, it gets today.
 *
 * Both flags arrive already computed by `cases` (`summarizePrescription`,
 * `cases/core/domain/prescription.ts`), the same function the case and the
 * dashboards use. The 70 % rule is **not** applied here: this subsystem only
 * reads the result, so what the daily check detects cannot drift from what
 * the dashboard shows (D-72, V4 §4 Proceso automático diario).
 */
export interface PrescriptionFlags {
  /** 70 % or more of the term elapsed. */
  alert: boolean;
  /** Today is on or after the expiry date. */
  expired: boolean;
}

/**
 * The notice a case's prescription calls for today (CA-52.2), or `null` when
 * it calls for none.
 *
 * - Expired → `PRESCRIPTION_EXPIRED`, **and only that one**, even though
 *   `alert` is also `true` by then (V-02). The 70 % alert belongs to the days
 *   between reaching the threshold and the expiry; once the term is met, the
 *   one thing worth saying is that it was met. A case the system first sees
 *   already expired gets just this notice: a late 70 % alert would say
 *   nothing useful.
 * - 70 % or more, not expired → `PRESCRIPTION_ALERT`.
 * - Below 70 % → `null`.
 *
 * Detecting the same case every day is expected: sending it only once is
 * `sent_notifications`' job, in the digest (CA-52.7).
 */
export function prescriptionNoticeKind(flags: PrescriptionFlags): PrescriptionNotice['kind'] | null {
  if (flags.expired) {
    return 'PRESCRIPTION_EXPIRED';
  }
  if (flags.alert) {
    return 'PRESCRIPTION_ALERT';
  }
  return null;
}
