import { TransactionManagerPort } from "@shared/domain/transaction-manager.port";
import { EmailMessage, EmailSenderPort } from "../../../domain/ports/email-sender.port";
import {
  LawyerContact,
  LawyerContactLookupPort,
} from "../../../domain/ports/lawyer-contact-lookup.port";
import {
  SentNotificationKey,
  SentNotificationRecord,
  SentNotificationRepository,
} from "../../../domain/ports/sent-notification.repository";

function keyString(key: SentNotificationKey): string {
  return `${key.caseId}:${key.kind}:${key.deadlineKind ?? "none"}:${key.referenceDate}:${key.recipientLawyerId ?? "mailbox"}`;
}

/**
 * In-memory {@link EmailSenderPort} for `deadlines`'s use-case specs.
 * `failFor` lets a spec make a specific recipient's send fail, to
 * exercise the per-recipient resilience N-07 asks for without one
 * failure taking down the others.
 */
export class FakeEmailSender implements EmailSenderPort {
  readonly sent: EmailMessage[] = [];
  readonly failFor = new Set<string>();

  async send(message: EmailMessage): Promise<void> {
    if (message.to.some((to) => this.failFor.has(to))) {
      throw new Error(`send failed for ${message.to.join(", ")}`);
    }
    this.sent.push(message);
  }
}

/**
 * In-memory {@link LawyerContactLookupPort}. A lawyer with no entry in
 * `byLawyerId` behaves like one with no linked user (CA-30.5): `null`,
 * not a thrown error.
 */
export class FakeLawyerContactLookup implements LawyerContactLookupPort {
  readonly byLawyerId = new Map<number, LawyerContact | null>();

  async findContactByLawyerId(lawyerId: number): Promise<LawyerContact | null> {
    return this.byLawyerId.get(lawyerId) ?? null;
  }
}

/**
 * In-memory {@link SentNotificationRepository}. `seed` lets a spec mark a
 * recipient as already notified before the use case runs, exercising
 * CA-30.7/CA-32.6's per-recipient idempotency.
 */
export class FakeSentNotificationRepository implements SentNotificationRepository {
  private readonly byKey = new Map<string, SentNotificationRecord>();

  seed(key: SentNotificationKey): void {
    this.byKey.set(keyString(key), { ...key, proceduralActId: null });
  }

  async existsFor(key: SentNotificationKey): Promise<boolean> {
    return this.byKey.has(keyString(key));
  }

  async record(entry: SentNotificationRecord): Promise<void> {
    this.byKey.set(keyString(entry), entry);
  }

  has(key: SentNotificationKey): boolean {
    return this.byKey.has(keyString(key));
  }
}

/** Passthrough fake, same shape as `cases/core/test-support/case-fakes.ts`'s. */
export class FakeTransactionManager implements TransactionManagerPort {
  calls = 0;

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    this.calls++;
    return work();
  }
}
