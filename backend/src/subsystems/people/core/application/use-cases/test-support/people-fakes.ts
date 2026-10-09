import { ClockPort } from "@shared/domain/clock.port";
import { Client } from "../../../domain/entities/client.entity";
import {
  ClientPage,
  ClientRepository,
  ClientSearchCriteria,
} from "../../../domain/ports/client.repository";
import { Dni } from "../../../domain/value-objects/dni.vo";
import { Lawyer } from "../../../domain/entities/lawyer.entity";
import {
  LawyerPage,
  LawyerRepository,
  LawyerSearchCriteria,
} from "../../../domain/ports/lawyer.repository";
import { RegistrationNumber } from "../../../domain/value-objects/registration-number.vo";

/**
 * In-memory {@link LawyerRepository} for `people`'s use-case specs —
 * no NestJS, no database. Mirrors `identity`'s `identity-fakes.ts`.
 */
export class FakeLawyerRepository implements LawyerRepository {
  private nextIdValue = 1;
  readonly byId = new Map<number, Lawyer>();

  async nextId(): Promise<number> {
    return this.nextIdValue++;
  }

  async existsByRegistrationNumber(
    registrationNumber: RegistrationNumber,
  ): Promise<boolean> {
    return [...this.byId.values()].some((lawyer) =>
      lawyer.registrationNumber.equals(registrationNumber),
    );
  }

  async create(lawyer: Lawyer): Promise<void> {
    this.byId.set(lawyer.id, lawyer);
  }

  async findById(id: number): Promise<Lawyer | null> {
    return this.byId.get(id) ?? null;
  }

  /**
   * Mirrors what `PrismaLawyerRepository.search` does in SQL: only
   * active lawyers, newest first, case-insensitive match on full name
   * or registration number, then the page slice. Kept faithful on
   * purpose — a fake that filtered differently would let a spec pass
   * against behaviour production does not have.
   */
  async findByIds(ids: readonly number[]): Promise<Lawyer[]> {
    return ids
      .map((id) => this.byId.get(id))
      .filter((lawyer): lawyer is Lawyer => lawyer !== undefined);
  }

  async search(criteria: LawyerSearchCriteria): Promise<LawyerPage> {
    const needle = criteria.search?.toLowerCase();

    const matches = [...this.byId.values()]
      .filter((lawyer) => lawyer.isActive())
      .filter(
        (lawyer) =>
          needle === undefined ||
          lawyer.fullName.toLowerCase().includes(needle) ||
          lawyer.registrationNumber.toString().toLowerCase().includes(needle),
      )
      .sort((a, b) => b.id - a.id);

    const offset = (criteria.page - 1) * criteria.limit;

    return {
      items: matches.slice(offset, offset + criteria.limit),
      totalItems: matches.length,
    };
  }
}

/**
 * In-memory {@link ClientRepository} for `people`'s use-case specs.
 *
 * `existsActiveByDni` filters by `isActive()` on purpose, mirroring
 * the partial unique index rather than a plain one: a spec that
 * passed against a stricter fake would hide the behaviour CA-8.4
 * actually asks for.
 */
export class FakeClientRepository implements ClientRepository {
  private nextIdValue = 1;
  readonly byId = new Map<number, Client>();

  async nextId(): Promise<number> {
    return this.nextIdValue++;
  }

  async existsActiveByDni(dni: Dni): Promise<boolean> {
    return [...this.byId.values()].some(
      (client) => client.isActive() && client.dni.equals(dni),
    );
  }

  async create(client: Client): Promise<void> {
    this.byId.set(client.id, client);
  }

  async findActiveById(id: number): Promise<Client | null> {
    const client = this.byId.get(id);
    return client !== undefined && client.isActive() ? client : null;
  }

  /**
   * Mirrors what `PrismaClientRepository.search` does in SQL: current
   * clients only, ordered by surname and then given names,
   * case-insensitive match on surname, given names or document, then
   * the page slice. Kept faithful on purpose — a fake that ordered or
   * filtered differently would let a spec pass against behaviour
   * production does not have.
   */
  async search(criteria: ClientSearchCriteria): Promise<ClientPage> {
    const needle = criteria.search?.toLowerCase();

    const matches = [...this.byId.values()]
      .filter((client) => client.isActive())
      .filter(
        (client) =>
          needle === undefined ||
          client.lastName.toLowerCase().includes(needle) ||
          client.firstName.toLowerCase().includes(needle) ||
          client.dni.toString().includes(needle),
      )
      .sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName),
      );

    const offset = (criteria.page - 1) * criteria.limit;

    return {
      items: matches.slice(offset, offset + criteria.limit),
      totalItems: matches.length,
    };
  }
}

/**
 * Clock frozen at a fixed civil date, so specs can assert the exact
 * `clientSince` the use case writes instead of comparing against a
 * moving `new Date()`.
 */
export class FakeClock implements ClockPort {
  constructor(private readonly fixed = new Date("2026-10-07T12:00:00Z")) {}

  now(): Date {
    return this.fixed;
  }

  today(): Date {
    return new Date(
      Date.UTC(
        this.fixed.getUTCFullYear(),
        this.fixed.getUTCMonth(),
        this.fixed.getUTCDate(),
      ),
    );
  }
}
