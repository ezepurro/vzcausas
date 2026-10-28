import { Inject, Injectable } from "@nestjs/common";
import {
  ClientRef,
  LawyerRef,
  PeopleLookupPort,
} from "@subsystems/cases/core/domain/ports/case/people-lookup.port";
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from "../../core/domain/ports/client.repository";
import {
  LAWYER_REPOSITORY,
  LawyerRepository,
} from "../../core/domain/ports/lawyer.repository";

/**
 * Implements the {@link PeopleLookupPort} that `cases` defines, with the
 * lawyers and clients this subsystem owns. It translates its own `Lawyer`
 * and `Client` into the smaller `LawyerRef` and `ClientRef` that `cases`
 * works with, so `cases` never depends on this subsystem's domain.
 *
 * A deactivated lawyer or client counts as non-existent (RN12): no case
 * can be assigned to either.
 */
@Injectable()
export class CasesPeopleLookupAdapter implements PeopleLookupPort {
  constructor(
    @Inject(LAWYER_REPOSITORY) private readonly lawyers: LawyerRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  async findActiveLawyerById(id: number): Promise<LawyerRef | null> {
    const lawyer = await this.lawyers.findById(id);
    if (!lawyer || !lawyer.isActive()) {
      return null;
    }
    return {
      id: lawyer.id,
      lastName: lawyer.lastName,
      firstName: lawyer.firstName,
      registrationNumber: lawyer.registrationNumber.toString(),
    };
  }

  async findLawyerById(id: number): Promise<LawyerRef | null> {
    const lawyer = await this.lawyers.findById(id);
    if (!lawyer) {
      return null;
    }
    return {
      id: lawyer.id,
      lastName: lawyer.lastName,
      firstName: lawyer.firstName,
      registrationNumber: lawyer.registrationNumber.toString(),
    };
  }

  async findActiveClientById(id: number): Promise<ClientRef | null> {
    // `findActiveById` already leaves out a deactivated client.
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
