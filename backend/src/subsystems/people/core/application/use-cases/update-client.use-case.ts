import { Inject, Injectable } from "@nestjs/common";
import { AUDIT_TRAIL, AuditTrailPort } from "@shared/domain/audit-trail.port";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import { TRANSACTION_MANAGER, TransactionManagerPort } from "@shared/domain/transaction-manager.port";
import { ClientChanges } from "../../domain/entities/client.entity";
import { ClientDniAlreadyExistsError, ClientNotFoundError } from "../../domain/errors/people.errors";
import { CaptionsFollowUp, ClientCaseCaptionsPort } from "../../domain/ports/client-case-captions.port";
import { CLIENT_REPOSITORY, ClientRepository } from "../../domain/ports/client.repository";
import { FindClientResult, FindClientUseCase } from "./find-client.use-case";

export type UpdateClientCommand = {
  clientId: number;
  changes: ClientChanges;
  /** Who modifies, for the audit records (CA-10.5). Any profile may (CA-10.6). */
  actorUserId: number;
};

/**
 * HU10 — corrects a client's data (contract V6, `PATCH /clients/{clientId}`).
 *
 * Coordinates and decides nothing: what a valid change is belongs to
 * {@link Client.update}, and how a caption follows the client's name belongs to
 * `cases`. Order of the checks, so a rejected request writes nothing: the
 * client exists (404) → the data (400) → the document is not another current
 * client's (409).
 *
 * The client, its audit record and — when the name changed — the captions of
 * its cases with their own audit records are written in **one transaction**
 * (CA-10.5, CA-10.9, D-121): none lands without the others. The Drive folders
 * are announced only **after** the commit and never fail the request
 * (CA-10.10).
 */
@Injectable()
export class UpdateClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(ClientCaseCaptionsPort) private readonly captions: ClientCaseCaptionsPort,
    @Inject(AUDIT_TRAIL) private readonly auditTrail: AuditTrailPort,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManagerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly findClient: FindClientUseCase,
  ) {}

  /**
   * @returns the client as `GET /clients/{clientId}` shows it, with
   *   `activeCases`: the response is built by {@link FindClientUseCase}.
   * @throws {ClientNotFoundError} 404, also for a client given de baja (CA-10.11).
   * @throws {ValidationError} 400 (CA-10.1, CA-10.3, CA-10.4).
   * @throws {ClientDniAlreadyExistsError} 409 (CA-10.7).
   */
  async execute(command: UpdateClientCommand): Promise<FindClientResult> {
    const client = await this.clients.findActiveById(command.clientId);
    if (!client) {
      throw new ClientNotFoundError();
    }

    const previous = { lastName: client.lastName, firstName: client.firstName };
    const changes = client.update(command.changes);

    const documentChanged = changes.fields.includes("documentType") || changes.fields.includes("documentNumber");
    if (documentChanged && (await this.clients.existsActiveByDocument(client.document, client.id))) {
      throw new ClientDniAlreadyExistsError();
    }

    const now = this.clock.now();
    const followUp = await this.transactions.runInTransaction<CaptionsFollowUp | null>(async () => {
      await this.clients.update(client);
      await this.auditTrail.record({
        actorUserId: command.actorUserId,
        action: "client.updated",
        entityType: "Client",
        entityId: String(client.id),
        occurredAt: now,
        // The names of the fields, never their values (audit §4).
        metadata: { changedFields: [...changes.fields] },
      });
      if (!changes.renamesClient()) {
        return null;
      }
      return this.captions.followRename({
        clientId: client.id,
        previous,
        next: { lastName: client.lastName, firstName: client.firstName },
        actorUserId: command.actorUserId,
        occurredAt: now,
      });
    });

    if (followUp) {
      await this.captions.announce(followUp);
    }

    return this.findClient.execute({ id: client.id });
  }
}
