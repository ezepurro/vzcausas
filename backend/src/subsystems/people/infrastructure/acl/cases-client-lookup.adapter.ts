import { Inject, Injectable } from "@nestjs/common";
import {
  ClientLookupPort,
  ClientRef,
} from "@subsystems/cases/core/domain/ports/client-lookup.port";
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from "../../core/domain/ports/client.repository";

/**
 * Implements the {@link ClientLookupPort} that `cases` defines, with the
 * clients this subsystem owns. Mirrors `CasesLawyerLookupAdapter`: the
 * port belongs to the consumer and the owner adapts to it, so `cases`
 * never depends on this subsystem's domain — it only knows `ClientRef`,
 * the seven fields it actually needs.
 *
 * Replaces `cases`'s `StubClientLookupAdapter`, which answered from a
 * two-element hardcoded array back when `people` had no clients. It has
 * them now, and `GET /cases?search=` has to match a client's surname and
 * given names (CA-20.2) — impossible against a stub.
 *
 * It reads `ClientRepository.findActiveById` rather than calling
 * `FindClientUseCase`, even though that use case exists. The use case
 * throws `ClientNotFoundError` instead of returning `null`, deliberately,
 * because it serves an HTTP read where absence has exactly one meaning:
 * 404. Here absence is a legitimate answer the caller interprets, so
 * catching that error to produce control flow would fight the design it
 * documents.
 *
 * A logically deleted client is reported as absent (RN12), which is the
 * answer `cases` needs: no case can be registered against a client that
 * was given de baja.
 */
@Injectable()
export class CasesClientLookupAdapter implements ClientLookupPort {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  async findActiveById(id: number): Promise<ClientRef | null> {
    const client = await this.clients.findActiveById(id);
    if (!client) {
      return null;
    }

    return {
      id: client.id,
      lastName: client.lastName,
      firstName: client.firstName,
      dni: client.dni.toString(),
      phone: client.phone,
      email: client.email,
      clientSince: client.clientSince,
    };
  }
}
