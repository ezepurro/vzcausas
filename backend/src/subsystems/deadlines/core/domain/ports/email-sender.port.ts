/** DI token for {@link EmailSenderPort}. */
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailMessage {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
}

/**
 * Named by need, not by technology (`ADR-004_EMAIL_GMAIL_API.md` §2.2): a
 * future change of provider stays correct behind this interface.
 *
 * Implemented by `GmailApiEmailAdapter` in `infrastructure/external/`, which
 * consumes the shared OAuth client in `shared/infrastructure/google/` — it
 * does not hold its own OAuth client (N-10).
 */
export interface EmailSenderPort {
  send(message: EmailMessage): Promise<void>;
}
