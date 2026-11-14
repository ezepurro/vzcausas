import { Inject, Injectable } from "@nestjs/common";
import { AUDIT_TRAIL, AuditTrailPort } from "@shared/domain/audit-trail.port";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import { TRANSACTION_MANAGER, TransactionManagerPort } from "@shared/domain/transaction-manager.port";
import { ClientHasActiveCasesError, ClientNotFoundError } from "../../domain/errors/people.errors";
import { ActiveCasesCounterPort } from "../../domain/ports/active-cases-counter.port";
import { CLIENT_REPOSITORY, ClientRepository } from "../../domain/ports/client.repository";
import {
  ClientDeactivation,
  ClientDeactivationInput,
} from "../../domain/value-objects/client-deactivation.vo";

export type DeactivateClientCommand = {
  clientId: number;
  /** What the form sends; the whole body is optional (CA-11.7). */
  input: ClientDeactivationInput;
  /** Who gives it de baja, for the record and the audit (CA-11.5). Any profile may (CA-11.6). */
  actorUserId: number;
};

/**
 * HU11 — gives a client de baja (contract V6, `DELETE /clients/{clientId}`).
 *
 * Coordinates and decides nothing: what a valid baja is belongs to
 * {@link ClientDeactivation} and `Client.deactivate`; which cases are active
 * belongs to `cases`, asked through {@link ActiveCasesCounterPort}. Order of the
 * checks, so a rejected request writes nothing: the client exists (404) → it
 * has no active cases (409, CA-11.2, D-122) → the reason (400). The baja and its
 * audit record are written in one transaction.
 *
 * Nothing goes to Drive: there is no client folder, and the folders of its
 * cases in a terminal state stay with them as history (CA-11.4).
 *
 * Known gap: a case registered for this client between the count and the
 * write is not seen. Closing it would need a lock across two subsystems.
 */
@Injectable()
export class DeactivateClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(ActiveCasesCounterPort) private readonly activeCases: ActiveCasesCounterPort,
    @Inject(AUDIT_TRAIL) private readonly auditTrail: AuditTrailPort,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManagerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /**
   * @throws {ClientNotFoundError} 404, also for a client already given de baja,
   *   even if another request gave it de baja a moment ago (CA-11.9).
   * @throws {ClientHasActiveCasesError} 409 (CA-11.2).
   * @throws {ValidationError} 400, a reason longer than 500 characters (CA-11.7).
   */
  async execute(command: DeactivateClientCommand): Promise<void> {
    const client = await this.clients.findActiveById(command.clientId);
    if (!client) {
      throw new ClientNotFoundError();
    }

    const counts = await this.activeCases.countByClient([client.id]);
    if ((counts.get(client.id) ?? 0) > 0) {
      throw new ClientHasActiveCasesError();
    }

    const now = this.clock.now();
    client.deactivate(
      ClientDeactivation.create(command.input, { deactivatedByUserId: command.actorUserId, deactivatedAt: now }),
    );

    await this.transactions.runInTransaction(async () => {
      if (!(await this.clients.saveDeactivation(client))) {
        throw new ClientNotFoundError();
      }
      // The reason stays with the client: it is free text (audit §4).
      await this.auditTrail.record({
        actorUserId: command.actorUserId,
        action: "client.deactivated",
        entityType: "Client",
        entityId: String(client.id),
        occurredAt: now,
      });
    });
  }
}
