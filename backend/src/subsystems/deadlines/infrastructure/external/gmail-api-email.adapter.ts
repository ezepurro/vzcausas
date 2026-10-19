import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { gmail_v1, google } from "googleapis";
import { GoogleOAuthClientService } from "@shared/infrastructure/google/google-oauth-client.service";
import {
  EmailMessage,
  EmailSenderPort,
} from "../../core/domain/ports/email-sender.port";

const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_REASONS = new Set(["rateLimitExceeded", "userRateLimitExceeded"]);

export type GmailMessagesClient = Pick<gmail_v1.Gmail, "users">;

/**
 * Production {@link EmailSenderPort}. The Gmail API has no higher-level
 * helper for sending mail: builds the MIME message by hand (RFC 2822),
 * base64url-encodes it, and calls `users.messages.send` (ADR-004 §2.2).
 *
 * `From` is always `MANAGEMENT_MAILBOX` — it must be the authenticated
 * account or Gmail rejects the send outright.
 *
 * Retries up to {@link MAX_ATTEMPTS} times with exponential backoff on a
 * transient error (`5xx`, `429`, `rateLimitExceeded` /
 * `userRateLimitExceeded`) — same criterion as `CloudStoragePort`,
 * ADR-003 §2.5. Anything else, including `invalid_grant`, is not
 * retryable: it needs a human to re-run the authorization (ADR-004 §2.1),
 * not another attempt.
 *
 * Does not touch `sent_notifications` — that is the use case's job, and
 * only after `send()` resolves without throwing (idempotency,
 * `ARQUITECTURA_BACKEND_V1.md:464`).
 */
@Injectable()
export class GmailApiEmailAdapter implements EmailSenderPort {
  private readonly logger = new Logger(GmailApiEmailAdapter.name);
  private readonly gmail: GmailMessagesClient;
  private readonly from: string;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    oauth: GoogleOAuthClientService,
    config: ConfigService,
    @Optional() gmailClient?: GmailMessagesClient,
    @Optional() sleep?: (ms: number) => Promise<void>,
  ) {
    this.gmail =
      gmailClient ?? google.gmail({ version: "v1", auth: oauth.getClient() });
    this.from = config.getOrThrow<string>("MANAGEMENT_MAILBOX");
    this.sleep =
      sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async send(message: EmailMessage): Promise<void> {
    const raw = this.buildRawMessage(message);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.gmail.users.messages.send({
          userId: "me",
          requestBody: { raw },
        });
        return;
      } catch (err) {
        const isLastAttempt = attempt === MAX_ATTEMPTS;
        const retryable = this.isRetryable(err);

        if (isLastAttempt || !retryable) {
          this.logger.error(
            `Gmail send failed after ${attempt} attempt(s): ${this.describe(err)}`,
          );
          throw err;
        }

        this.logger.warn(
          `Gmail send attempt ${attempt}/${MAX_ATTEMPTS} failed, retrying: ${this.describe(err)}`,
        );
        await this.sleep(2 ** (attempt - 1) * 1000);
      }
    }
  }

  /**
   * RFC 2822 headers + body, base64url-encoded (no padding) per
   * `users.messages.send`'s `raw` field. Subject goes through RFC 2047
   * encoded-word: message text is Spanish (`dominio.md`), so it is never
   * pure ASCII.
   */
  private buildRawMessage(message: EmailMessage): string {
    const subjectHeader = `=?UTF-8?B?${Buffer.from(message.subject, "utf-8").toString("base64")}?=`;

    const headers = [
      `From: ${this.from}`,
      `To: ${message.to.join(", ")}`,
      ...(message.cc && message.cc.length > 0
        ? [`Cc: ${message.cc.join(", ")}`]
        : []),
      `Subject: ${subjectHeader}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
    ].join("\r\n");

    const mime = `${headers}\r\n\r\n${message.html}`;

    return Buffer.from(mime, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  private isRetryable(err: unknown): boolean {
    const status = this.extractStatus(err);
    if (status !== undefined && RETRYABLE_STATUS.has(status)) {
      return true;
    }
    const reason = this.extractReason(err);
    return reason !== undefined && RETRYABLE_REASONS.has(reason);
  }

  private extractStatus(err: unknown): number | undefined {
    const e = err as { code?: number | string; response?: { status?: number } };
    if (typeof e?.response?.status === "number") {
      return e.response.status;
    }
    if (e?.code !== undefined) {
      const parsed = Number(e.code);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private extractReason(err: unknown): string | undefined {
    const e = err as { errors?: Array<{ reason?: string }> };
    return e?.errors?.[0]?.reason;
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
