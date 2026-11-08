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
  /**
   * Development shortcut: forget what was already sent before filtering, so a
   * manual run can be repeated. The caller decides whether it is allowed.
   */
  resetHistory?: boolean;
}

export interface SendDailyNotificationDigestResult {
  mailboxSent: boolean;
  mailboxNoticeCount: number;
  lawyerSends: Array<{ lawyerId: number; sent: boolean; noticeCount: number }>;
}

function isDeadlineNotice(notice: Notice): notice is UpcomingDeadlineNotice {
  return notice.kind === "DEADLINE_WARNING" || notice.kind === "DEADLINE_DUE_TODAY";
}

/** Calcado de `frontend/src/styles/tokens.css` — única fuente de verdad del color ahí; acá, una copia estática. */
const BRAND = {
  canvas: "#F6F7F4",
  surface: "#FFFFFF",
  border: "#DDE2DC",
  rail: "#0C1406",
  railFg: "#8B9984",
  ink: "#0F172A",
  muted: "#5A6560",
  faint: "#68716C",
  font: "'Figtree', -apple-system, system-ui, sans-serif",
  fontMono: "'Roboto Mono', ui-monospace, SFMono-Regular, monospace",
} as const;

interface Tone {
  color: string;
  bg: string;
  border: string;
}

/** Mismos cuatro tonos que `.vz-pill--*` (`feedback.css`). */
const TONES: Record<"ok" | "warn" | "danger" | "neutral", Tone> = {
  ok: { color: "#2F4D2F", bg: "#EEF3EC", border: "#D8E4D5" },
  warn: { color: "#7A5C1E", bg: "#FBF3E2", border: "#EBDCB8" },
  danger: { color: "#8E1F19", bg: "#FBEAE8", border: "#F0CDC9" },
  neutral: { color: "#5A6560", bg: "#F1F3EF", border: "#DDE2DC" },
};

/** `YYYY-MM-DD` a `DD/MM/AAAA`, como `shared/lib/dates.ts#formatDate` del frontend. Solo reordena el string: sin `Date`, sin huso horario. */
function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Los datos de una causa (carátula, SAC) son texto libre cargado por un abogado: sin esto, uno con `<`/`&` rompería el HTML del correo. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

    if (command.resetHistory) {
      await this.sentNotifications.clearAll();
    }

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
   * mismo algoritmo, distinto input. Separa vencimientos de prescripciones
   * en dos secciones porque son avisos de naturaleza distinta (CA-30 vs.
   * CA-32), no porque haya dos algoritmos: las dos pasan por `renderSection`.
   * Paleta, tipografía y pills calcados de `frontend/src/styles/tokens.css`,
   * `feedback.css` (`.vz-pill`) y `features/cases/utils/deadlineStatus.ts` —
   * mismos colores y mismo texto que ve un abogado en la app, a pedido de
   * mmachuca (20/10/2026). Todo en estilos inline: un correo no tiene hoja de
   * estilos propia, y es lo único que todos los clientes de correo soportan
   * igual.
   */
  private render(to: string[], notices: Notice[]): EmailMessage {
    const deadlineNotices = notices.filter(isDeadlineNotice);
    const prescriptionNotices = notices.filter(
      (notice): notice is PrescriptionNotice => !isDeadlineNotice(notice),
    );

    const body =
      this.renderSection("Vencimientos próximos", deadlineNotices, (n) => this.renderDeadlineRow(n)) +
      this.renderSection("Prescripciones", prescriptionNotices, (n) => this.renderPrescriptionRow(n));

    return {
      to,
      subject: "Avisos de vencimientos y prescripciones — VZ Causas",
      html: this.renderShell(body),
    };
  }

  /**
   * De punta a punta (el color llega a los bordes del cliente de correo,
   * sin margen gris alrededor de una tarjeta) — ajustado a pedido de
   * mmachuca (21/10/2026) sobre la vista anterior, que dejaba ver el canvas
   * a los costados. Cada fila de la tabla externa es una franja a
   * `width:100%` con su color; el contenido de cada una se centra en una
   * tabla interna de 620px — técnica estándar de correo para el sangrado.
   * Sin `border-radius` en ningún lado: una franja de punta a punta no
   * tiene esquina que redondear.
   *
   * Isotipo vectorial real, descartado: lo probamos embebido (`<svg>`) y
   * Gmail lo saca del correo entero — no lo escala mal, directamente no lo
   * muestra (confirmado contra Gmail real, 21/10/2026). Mostrar el logo de
   * verdad necesita un `<img src="https://...">` a una imagen alojada en
   * una URL pública, que no existe todavía (el frontend corre en
   * `localhost`). Para no bloquear esto en infraestructura que se tira al
   * desplegar la semana que viene, el monograma es texto: "VZ" en negrita
   * dentro de una cajita (chico, al lado del wordmark) y el mismo texto
   * grande con opacidad baja como marca de agua — sin SVG, sin imagen,
   * garantizado en cualquier cliente de correo.
   */
  private renderShell(body: string): string {
    return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:${BRAND.canvas};font-family:${BRAND.font};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="background:${BRAND.rail};padding:36px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;">
            <tr>
              <td style="vertical-align:middle;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="46" height="46" align="center" valign="middle" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);border-radius:10px;font-size:15px;font-weight:800;color:#FFFFFF;letter-spacing:-.02em;">VZ</td>
                    <td style="width:14px;">&nbsp;</td>
                    <td style="vertical-align:middle;">
                      <div style="font-size:19px;font-weight:800;color:#FFFFFF;letter-spacing:-.01em;">Vázquez &amp; Zárate</div>
                      <div style="font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:${BRAND.railFg};margin-top:4px;">Staff de Abogados</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td width="90" style="vertical-align:middle;text-align:right;">
                <span style="font-size:64px;line-height:1;font-weight:800;color:rgba(255,255,255,.08);">VZ</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:${BRAND.surface};padding:28px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;">
            <tr>
              <td>
                <p style="margin:0 0 18px;font-size:13px;color:${BRAND.muted};">Avisos del día:</p>
                ${body}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:${BRAND.canvas};padding:16px 24px;text-align:center;">
          <span style="font-size:11px;color:${BRAND.faint};">Aviso automático de VZ Causas — no responder este correo.</span>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private renderSection<T>(title: string, items: T[], renderRow: (item: T) => string): string {
    if (items.length === 0) {
      return "";
    }
    const rows = items.map(renderRow).join("");
    return `<div style="margin:0 0 20px;">
      <div style="font-size:14px;font-weight:700;color:${BRAND.ink};margin:0 0 10px;">${title}</div>
      ${rows}
    </div>`;
  }

  /** Mismos cortes y mismo texto que `deadlineStatus.ts` (sin OVERDUE: nunca llega hasta acá, D-64). */
  private renderDeadlineRow(notice: UpcomingDeadlineNotice): string {
    const { label, tone } =
      notice.kind === "DEADLINE_DUE_TODAY"
        ? { label: "Vence hoy", tone: TONES.danger }
        : {
            label: this.plural(notice.businessDaysRemaining, "En", "día hábil", "días hábiles"),
            tone: notice.businessDaysRemaining <= 5 ? TONES.warn : TONES.neutral,
          };

    return this.renderRow(notice.caption, this.sacAndDate(notice.sacNumber, notice.dueDate), label, tone);
  }

  /** Mismo tono que `PrescriptionBar`: `expired` → danger, `alert` → warn. */
  private renderPrescriptionRow(notice: PrescriptionNotice): string {
    const { label, tone } =
      notice.kind === "PRESCRIPTION_EXPIRED"
        ? { label: "Prescribe hoy", tone: TONES.danger }
        : { label: this.plural(notice.daysRemaining, "En", "día", "días"), tone: TONES.warn };

    const meta = `${this.sacAndDate(notice.sacNumber, notice.referenceDate)} · ${escapeHtml(notice.legalQualificationName)}`;
    return this.renderRow(notice.caption, meta, label, tone);
  }

  private renderRow(caption: string, meta: string, label: string, tone: Tone): string {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;border:1px solid ${BRAND.border};border-radius:14px;background:${BRAND.surface};">
      <tr>
        <td style="padding:14px 16px;vertical-align:top;">
          <div style="font-size:13.5px;font-weight:700;line-height:1.35;color:${BRAND.ink};">${escapeHtml(caption)}</div>
          <div style="font-size:11.5px;color:${BRAND.muted};margin-top:3px;font-family:${BRAND.fontMono};">${meta}</div>
        </td>
        <td style="padding:12px 14px;vertical-align:middle;text-align:right;white-space:nowrap;">
          <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid ${tone.border};color:${tone.color};background:${tone.bg};">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${tone.color};margin-right:6px;"></span>${label}
          </span>
        </td>
      </tr>
    </table>`;
  }

  private sacAndDate(sacNumber: string | null, isoDate: string): string {
    const sac = sacNumber ? `SAC ${escapeHtml(sacNumber)}` : "Sin SAC";
    return `${sac} · ${formatIsoDate(isoDate)}`;
  }

  private plural(count: number, prefix: string, singular: string, pluralForm: string): string {
    return `${prefix} ${count} ${count === 1 ? singular : pluralForm}`;
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
