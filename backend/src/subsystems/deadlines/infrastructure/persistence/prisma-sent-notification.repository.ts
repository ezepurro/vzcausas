import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import {
  SentNotificationKey,
  SentNotificationRecord,
  SentNotificationRepository,
} from "../../core/domain/ports/sent-notification.repository";

/**
 * Production {@link SentNotificationRepository}.
 *
 * `existsFor` filters on exactly the five columns
 * {@link SentNotificationKey} carries, matching the real unique
 * constraint, `sent_notifications_once_key` (`schema.prisma:750`), field
 * for field — `deadlineKind` included, so a case with two concurrently
 * open deadlines (one `PROCEDURAL_ACT`, one `HARMFUL_ACT`) landing on
 * the same `kind` and `referenceDate` are still tracked as two separate
 * notifications, not one.
 */
@Injectable()
export class PrismaSentNotificationRepository implements SentNotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsFor(key: SentNotificationKey): Promise<boolean> {
    const row = await this.prisma.db.sentNotification.findFirst({
      where: {
        caseId: key.caseId,
        kind: key.kind,
        deadlineKind: key.deadlineKind,
        referenceDate: this.toDate(key.referenceDate),
        recipientLawyerId: key.recipientLawyerId,
      },
      select: { id: true },
    });
    return row !== null;
  }

  async record(entry: SentNotificationRecord): Promise<void> {
    await this.prisma.db.sentNotification.create({
      data: {
        caseId: entry.caseId,
        kind: entry.kind,
        deadlineKind: entry.deadlineKind,
        proceduralActId: entry.proceduralActId,
        referenceDate: this.toDate(entry.referenceDate),
        recipientLawyerId: entry.recipientLawyerId,
      },
    });
  }

  async clearAll(): Promise<void> {
    await this.prisma.db.sentNotification.deleteMany();
  }

  /**
   * `referenceDate` is a civil date (`@db.Date`). A date-only ISO string
   * (`"2026-10-18"`) parses as UTC midnight per the `Date` constructor's
   * own spec — the same convention `toIsoDate`
   * (`shared/infrastructure/http/iso-date.ts`) assumes on the way out.
   */
  private toDate(isoDate: string): Date {
    return new Date(isoDate);
  }
}
