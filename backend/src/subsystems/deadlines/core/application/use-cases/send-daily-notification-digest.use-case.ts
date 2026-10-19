import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  TRANSACTION_MANAGER,
  TransactionManagerPort,
} from "@shared/domain/transaction-manager.port";
import {
  NotificationKind,
  PrescriptionNotice,
  UpcomingDeadlineNotice,
} from "../../domain/types/upcoming-deadline-notice";
import {
  EMAIL_SENDER,
  EmailMessage,
  EmailSenderPort,
} from "../../domain/ports/email-sender.port";
import {
  LAWYER_CONTACT_LOOKUP,
  LawyerContactLookupPort,
} from "../../domain/ports/lawyer-contact-lookup.port";
import {
  SENT_NOTIFICATION_REPOSITORY,
  SentNotificationKey,
  SentNotificationRecord,
  SentNotificationRepository,
} from "../../domain/ports/sent-notification.repository";
import {
  COPY_TO_RESPONSIBLE_LAWYER,
  MANAGEMENT_MAILBOX,
} from "../../domain/ports/daily-digest-config.port";

type Notice = UpcomingDeadlineNotice | PrescriptionNotice;

export interface SendDailyNotificationDigestCommand {
  deadlineNotices: UpcomingDeadlineNotice[];
  prescriptionNotices: PrescriptionNotice[];
}

export interface SendDailyNotificationDigestResult {
  mailboxSent: boolean;
  mailboxNoticeCount: number;
  lawyerSends: Array<{ lawyerId: number; sent: boolean; noticeCount: number }>;
}

function isDeadlineNotice(notice: Notice): notice is UpcomingDeadlineNotice {
  return notice.kind === "DEADLINE_WARNING" || notice.kind === "DEADLINE_DUE_TODAY";
}

function referenceDateOf(notice: Notice): string {
  return isDeadlineNotice(notice) ? notice.dueDate : notice.referenceDate;
}

function deadlineKindOf(notice: Notice): 'PROCEDURAL_ACT' | 'HARMFUL_ACT' | null {
  return isDeadlineNotice(notice) ? notice.origin : null;
}

function keyFor(notice: Notice, recipientLawyerId: number | null): SentNotificationKey {
  return {
    caseId: notice.caseId,
    kind: notice.kind as NotificationKind,
    deadlineKind: deadlineKindOf(notice),
    referenceDate: referenceDateOf(notice),
    recipientLawyerId,
  };
}

function recordFor(
  notice: Notice,
  recipientLawyerId: number | null,
): SentNotificationRecord {
  return {
    ...keyFor(notice, recipientLawyerId),
    proceduralActId: isDeadlineNotice(notice) ? notice.proceduralActId : null,
  };
}

/**
 * HU30 + HU32 converge here (N-05, CA-30.6, CA-32.7): one use case, one
 * mapper for the body (N-06), applied to two recipient sets. Detects
 * nothing — `deadlineNotices`/`prescriptionNotices` come already filtered
 * to what matters today from HU51/HU52 (another team member, N-02), and
 * every date here is copied as received, never recomputed (D-72,
 * CA-30.10). Does not touch `cases` (CA-30.12, CA-32.8).
 *
 * **Port classification** (`EJEMPLO_CASO_DE_USO.md` §8):
 * {@link SentNotificationRepository} is essential — if a lookup or a
 * write to it fails, that lets the error propagate rather than guess
 * whether a recipient was already notified; nothing was recorded, so the
 * next GitHub Actions invocation (N-04, every 2-3h) retries cleanly.
 * {@link EmailSenderPort} and {@link LawyerContactLookupPort} are
 * complementary **per recipient** (N-07): a failure sending to, or
 * resolving, one lawyer is logged and does not stop the mailbox send or
 * any other lawyer's — it is simply left unrecorded, so N-04's retry
 * picks up exactly that gap.
 */
@Injectable()
export class SendDailyNotificationDigestUseCase {
  private readonly logger = new Logger(SendDailyNotificationDigestUseCase.name);

  constructor(
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSenderPort,
    @Inject(LAWYER_CONTACT_LOOKUP)
    private readonly lawyerContacts: LawyerContactLookupPort,
    @Inject(SENT_NOTIFICATION_REPOSITORY)
    private readonly sentNotifications: SentNotificationRepository,
    @Inject(MANAGEMENT_MAILBOX) private readonly managementMailbox: string,
    /**
     * D-79: config del servidor. De dónde sale exactamente (env var,
     * tabla) todavía no está resuelto — QN-03,
     * `IMPLEMENTACION_NOTIFICACIONES.md`. El caso de uso solo consume el
     * valor ya resuelto; no le importa el origen.
     */
    @Inject(COPY_TO_RESPONSIBLE_LAWYER)
    private readonly copyToResponsibleLawyer: boolean,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManagerPort,
  ) {}

  async execute(
    command: SendDailyNotificationDigestCommand,
  ): Promise<SendDailyNotificationDigestResult> {
    const notices: Notice[] = [
      ...command.deadlineNotices,
      ...command.prescriptionNotices,
    ];

    const mailbox = await this.sendToMailbox(notices);
    const lawyerSends = this.copyToResponsibleLawyer
      ? await this.sendToLawyers(notices)
      : [];

    return { ...mailbox, lawyerSends };
  }

  /** CA-30.4: siempre a la casilla, con todo lo pendiente — sin filtrar por abogado. */
  private async sendToMailbox(
    notices: Notice[],
  ): Promise<
    Pick<SendDailyNotificationDigestResult, "mailboxSent" | "mailboxNoticeCount">
  > {
    const pending = await this.filterPending(notices, null);
    if (pending.length === 0) {
      return { mailboxSent: false, mailboxNoticeCount: 0 };
    }

    try {
      await this.emailSender.send(this.render([this.managementMailbox], pending));
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el aviso diario a la casilla de gestión: ${this.describe(error)}`,
      );
      return { mailboxSent: false, mailboxNoticeCount: 0 };
    }

    await this.markSent(pending, null);
    return { mailboxSent: true, mailboxNoticeCount: pending.length };
  }

  /**
   * CA-30.5: una copia por abogado responsable, solo con sus causas — no
   * es una copia del correo de la casilla (N-07). Sin usuario vinculado o
   * sin email, se omite en silencio, no es un error.
   */
  private async sendToLawyers(
    notices: Notice[],
  ): Promise<SendDailyNotificationDigestResult["lawyerSends"]> {
    const byLawyer = this.groupByResponsibleLawyer(notices);
    const results: SendDailyNotificationDigestResult["lawyerSends"] = [];

    for (const [lawyerId, lawyerNotices] of byLawyer) {
      const pending = await this.filterPending(lawyerNotices, lawyerId);
      if (pending.length === 0) {
        results.push({ lawyerId, sent: false, noticeCount: 0 });
        continue;
      }

      try {
        const contact = await this.lawyerContacts.findContactByLawyerId(lawyerId);
        if (!contact?.userEmail) {
          results.push({ lawyerId, sent: false, noticeCount: 0 });
          continue;
        }

        await this.emailSender.send(this.render([contact.userEmail], pending));
      } catch (error) {
        this.logger.error(
          `No se pudo enviar la copia del aviso diario al abogado ${lawyerId}: ${this.describe(error)}`,
        );
        results.push({ lawyerId, sent: false, noticeCount: 0 });
        continue;
      }

      await this.markSent(pending, lawyerId);
      results.push({ lawyerId, sent: true, noticeCount: pending.length });
    }

    return results;
  }

  /** CA-30.7, CA-32.6: no avisar dos veces al mismo destinatario por el mismo vencimiento/prescripción. */
  private async filterPending(
    notices: Notice[],
    recipientLawyerId: number | null,
  ): Promise<Notice[]> {
    const pending: Notice[] = [];
    for (const notice of notices) {
      const alreadySent = await this.sentNotifications.existsFor(
        keyFor(notice, recipientLawyerId),
      );
      if (!alreadySent) {
        pending.push(notice);
      }
    }
    return pending;
  }

  /**
   * El envío ya se confirmó cuando esto se llama. Todas las filas de
   * este destinatario se registran dentro de una sola transacción
   * (§7.5 de la arquitectura): o quedan todas, o ninguna — nunca un
   * registro parcial de un lote que en realidad salió completo en un
   * solo correo. No elimina el riesgo de fondo (el correo salió y la
   * transacción entera falla igual, así que `sent_notifications` no se
   * entera y la próxima corrida reenvía duplicado), solo lo acota: antes
   * el riesgo era por notificación, ahora es por destinatario. Se
   * loguea como error de severidad alta en vez de ocultarlo.
   */
  private async markSent(notices: Notice[], recipientLawyerId: number | null): Promise<void> {
    try {
      await this.transactions.runInTransaction(async () => {
        for (const notice of notices) {
          await this.sentNotifications.record(recordFor(notice, recipientLawyerId));
        }
      });
    } catch (error) {
      this.logger.error(
        `Aviso enviado (destinatario ${recipientLawyerId ?? "casilla"}) pero no se pudo registrar en sent_notifications — probable reenvío duplicado en la próxima corrida: ${this.describe(error)}`,
      );
    }
  }

  private groupByResponsibleLawyer(notices: Notice[]): Map<number, Notice[]> {
    const groups = new Map<number, Notice[]>();
    for (const notice of notices) {
      const group = groups.get(notice.responsibleLawyerId);
      if (group) {
        group.push(notice);
      } else {
        groups.set(notice.responsibleLawyerId, [notice]);
      }
    }
    return groups;
  }

  /**
   * N-06: un único mapper, reusado para la casilla y para cada abogado —
   * mismo algoritmo, distinto input. Contenido y diseño del correo no
   * están pinned por ningún CA leído hasta ahora: placeholder razonable,
   * pendiente de revisión de contenido.
   */
  private render(to: string[], notices: Notice[]): EmailMessage {
    const items = notices.map((notice) => `<li>${this.describeNotice(notice)}</li>`).join("");

    return {
      to,
      subject: "Avisos de vencimientos y prescripciones — VZ Causas",
      html: `<p>Avisos del día:</p><ul>${items}</ul>`,
    };
  }

  private describeNotice(notice: Notice): string {
    const sac = notice.sacNumber ? ` (SAC ${notice.sacNumber})` : "";

    if (isDeadlineNotice(notice)) {
      const label = notice.kind === "DEADLINE_DUE_TODAY" ? "vence hoy" : "vence pronto";
      return `${notice.caption}${sac} — ${label}: ${notice.dueDate}`;
    }

    const label =
      notice.kind === "PRESCRIPTION_EXPIRED" ? "prescribe hoy" : "cerca de prescribir";
    return `${notice.caption}${sac} — ${label} por ${notice.legalQualificationName}: ${notice.referenceDate}`;
  }

  private describe(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
}
