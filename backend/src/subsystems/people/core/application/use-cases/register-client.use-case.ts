import { Inject, Injectable } from "@nestjs/common";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import { Client } from "../../domain/entities/client.entity";
import { ClientDniAlreadyExistsError } from "../../domain/errors/people.errors";
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from "../../domain/ports/client.repository";
import { ClientDocument } from "../../domain/value-objects/client-document.vo";

export type RegisterClientCommand = {
  lastName: string;
  firstName: string;
  documentType: string;
  documentNumber: string;
  address: string;
  phone: string;
  email?: string | null;
};

export type RegisterClientResult = { client: Client };

/**
 * HU-8 — registers a client of the firm (contract §3.6).
 *
 * Registering a client creates **nothing else**: no case is opened
 * and the client starts with zero active cases (CA-8.8). RN1 fixes
 * the case as the unit of work, so the two are linked later and from
 * the other side.
 *
 * `clientSince` is taken from the clock, never from the request: the
 * contract does not accept the field and the criterion says the
 * system assigns it and does not offer it for editing (CA-8.7).
 *
 * No transaction: this is a single insert. `TransactionManagerPort`
 * exists (§7.5) and `RegisterUser` uses it because it writes to two
 * tables; here it would add a round trip for nothing.
 */
@Injectable()
export class RegisterClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(
    command: RegisterClientCommand,
  ): Promise<RegisterClientResult> {
    // Normalizes first: `34.812.905` and `34812905` are the same
    // document, and comparing the raw input would let both through as
    // two different clients.
    const document = ClientDocument.create(
      command.documentType,
      command.documentNumber,
    );

    // The partial unique index is what actually holds under
    // concurrency; this check exists so the caller gets the contract's
    // 409 instead of a raw constraint violation. Same reasoning as the
    // lawyer's matrícula.
    if (await this.clients.existsActiveByDocument(document)) {
      throw new ClientDniAlreadyExistsError();
    }

    const id = await this.clients.nextId();
    const client = Client.create({
      id,
      lastName: command.lastName,
      firstName: command.firstName,
      document,
      address: command.address,
      phone: command.phone,
      email: command.email,
      clientSince: this.clock.today(),
    });

    await this.clients.create(client);

    return { client };
  }
}
