import { EmailMessage, EmailSenderPort } from '../../../src/subsystems/deadlines/core/domain/ports/email-sender.port';

/**
 * Primer fake de `test/shared/fakes/` (`test/README.md` §3.8): reemplaza un
 * adaptador de servicio EXTERNO completo vía `overrideProvider`, nunca la
 * base. Guarda cada correo que le llega y permite simular la falla de un
 * destinatario puntual, para ejercitar la resiliencia por destinatario que
 * pide N-07 (`send-daily-notification-digest.use-case.ts`).
 */
export class InMemoryEmailSender implements EmailSenderPort {
  readonly sent: EmailMessage[] = [];
  readonly failFor = new Set<string>();

  async send(message: EmailMessage): Promise<void> {
    if (message.to.some((to) => this.failFor.has(to))) {
      throw new Error(`send failed for ${message.to.join(', ')}`);
    }
    this.sent.push(message);
  }

  reset(): void {
    this.sent.length = 0;
    this.failFor.clear();
  }
}
