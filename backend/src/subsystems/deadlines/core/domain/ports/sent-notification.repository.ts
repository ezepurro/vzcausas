import { NotificationKind } from '../types/upcoming-deadline-notice';

/** DI token for {@link SentNotificationRepository}. */
export const SENT_NOTIFICATION_REPOSITORY = Symbol('SENT_NOTIFICATION_REPOSITORY');

/**
 * Identifies one notification sent to one recipient. `recipientLawyerId: null`
 * means the management mailbox; a value means that lawyer's copy — they are
 * independent sends, not a copy of each other (corrected 18/10/2026,
 * `.claude/rules/notificaciones.md`).
 *
 * `referenceDate` is part of the key, not metadata: a renewed harmful act
 * opens a new deadline with another date (CA-30.8), and an interruptive act
 * that restarts prescription makes the case reach 70% again with another
 * `prescriptionExpiresOn` (CA-32.6). Without the date, the second time around
 * nobody would be notified.
 *
 * `deadlineKind` is part of the key too (corrected 18/10/2026, matching the
 * real unique constraint, `sent_notifications_once_key` in
 * `schema.prisma:750`) — not just extra metadata on the record. Without it, a
 * case with two deadlines open at once (one `PROCEDURAL_ACT`, one
 * `HARMFUL_ACT`) that happen to share the same `kind` and `referenceDate`
 * would have the second one silently treated as "already sent" when it was
 * never notified. `null` for prescription notices, which have no deadline
 * kind at all.
 */
export interface SentNotificationKey {
  caseId: number;
  kind: NotificationKind;
  deadlineKind: 'PROCEDURAL_ACT' | 'HARMFUL_ACT' | null;
  referenceDate: string;
  recipientLawyerId: number | null;
}

/**
 * The row inserted once a send is confirmed. Extends the key with the one
 * extra column `cambios-bdd-sprint3.md:248` (N-08) defines that is not part
 * of uniqueness — `null` for prescription notices, which have no procedural
 * act.
 */
export interface SentNotificationRecord extends SentNotificationKey {
  proceduralActId: number | null;
}

/**
 * The only thing this half of `deadlines` writes, and it exists for one
 * reason: don't notify the same recipient twice for the same reference date
 * (CA-30.7, CA-32.6).
 *
 * `record` is only called after the corresponding send is confirmed —
 * inserting before the send and having it fail would lose the notice for
 * that recipient forever.
 */
export interface SentNotificationRepository {
  existsFor(key: SentNotificationKey): Promise<boolean>;
  record(entry: SentNotificationRecord): Promise<void>;

  /**
   * Forgets every notification sent, so the next run sends them all again.
   * Only for the development shortcut (`?dev=true` of the daily run): it is a
   * physical delete of a log table, never part of the real flow, and the
   * caller must have checked the environment (`DEV_TOOLS_ENABLED`).
   */
  clearAll(): Promise<void>;
}
