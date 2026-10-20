import { UpcomingDeadlineNotice } from './types/upcoming-deadline-notice';

/**
 * What the daily check (HU51) makes of one open deadline (CA-51.3): a warning,
 * the day it falls, or already overdue. `OVERDUE` is detected but **not**
 * notified (D-64, V-13): it has no `notification_kind` and never reaches the
 * digest.
 */
export type DeadlineDetection = UpcomingDeadlineNotice['kind'] | 'OVERDUE';

/**
 * Classifies an open deadline by its `businessDaysRemaining` — the number the
 * case and the dashboards show, computed by `cases` (CA-51.9). This function
 * computes no dates; it only reads that number against the warning days of
 * the server configuration (D-79, V-14).
 *
 * - Negative → `OVERDUE`.
 * - `0` → `DEADLINE_DUE_TODAY`.
 * - From `1` up to `warningBusinessDays` → `DEADLINE_WARNING`. A window, not
 *   the exact day (V-12): a deadline still gets its warning if a run was
 *   missed or if it opened with fewer days left. It is sent once anyway, by
 *   `sent_notifications` in the digest.
 * - More than that → `null`: nothing to say yet.
 */
export function deadlineNoticeKind(
  businessDaysRemaining: number,
  warningBusinessDays: number,
): DeadlineDetection | null {
  if (businessDaysRemaining < 0) {
    return 'OVERDUE';
  }
  if (businessDaysRemaining === 0) {
    return 'DEADLINE_DUE_TODAY';
  }
  if (businessDaysRemaining <= warningBusinessDays) {
    return 'DEADLINE_WARNING';
  }
  return null;
}
