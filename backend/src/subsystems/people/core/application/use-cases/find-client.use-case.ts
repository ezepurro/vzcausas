import { Inject, Injectable } from "@nestjs/common";
import { Client } from "../../domain/entities/client.entity";
import { ClientNotFoundError } from "../../domain/errors/people.errors";
import { ActiveCasesCounterPort } from "../../domain/ports/active-cases-counter.port";
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from "../../domain/ports/client.repository";

export type FindClientQuery = { id: number };

export type FindClientResult = { client: Client; activeCases: number };

/**
 * `GET /clients/{clientId}` (§3.6, HU-9).
 *
 * Throws rather than returning `null`, unlike `people`'s
 * {@link FindLawyerUseCase}: that one exists so another subsystem can
 * ask "does this lawyer exist?", where absence is a legitimate answer
 * the caller interprets. This one serves an HTTP read, where absence
 * has exactly one meaning — 404.
 *
 * A logically deleted client is reported as absent (RN12): through
 * this endpoint it must be indistinguishable from one that never
 * existed.
 */
@Injectable()
export class FindClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(ActiveCasesCounterPort)
    private readonly activeCasesCounter: ActiveCasesCounterPort,
  ) {}

  async execute(query: FindClientQuery): Promise<FindClientResult> {
    const client = await this.clients.findActiveById(query.id);
    if (client === null) {
      throw new ClientNotFoundError();
    }

    const counts = await this.activeCasesCounter.countByClient([client.id]);
    return { client, activeCases: counts.get(client.id) ?? 0 };
  }
}
