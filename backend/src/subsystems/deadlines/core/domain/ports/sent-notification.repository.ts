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
 */
export interface SentNotificationKey {
  caseId: number;
  kind: NotificationKind;
  referenceDate: string;
  recipientLawyerId: number | null;
}

/**
 * The row inserted once a send is confirmed. Extends the key with the extra
 * columns `cambios-bdd-sprint3.md:248` (N-08) defines for deadline notices —
 * `null` for prescription notices, which have no procedural act.
 */
export interface SentNotificationRecord extends SentNotificationKey {
  deadlineKind: 'PROCEDURAL_ACT' | 'HARMFUL_ACT' | null;
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
}
