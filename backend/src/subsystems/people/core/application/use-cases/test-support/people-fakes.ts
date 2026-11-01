import { AuditEntry, AuditTrailPort } from "@shared/domain/audit-trail.port";
import { ClockPort } from "@shared/domain/clock.port";
import { TransactionManagerPort } from "@shared/domain/transaction-manager.port";
import { EventPublisher } from "@shared/infrastructure/events/event-publisher.port";
import { IntegrationEvent } from "@shared/infrastructure/events/integration-event";
import { Client } from "../../../domain/entities/client.entity";
import { ActiveCasesCounterPort } from "../../../domain/ports/active-cases-counter.port";
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

  /** Every lawyer `update` received, in order: what a modification really wrote. */
  readonly updates: Lawyer[] = [];

  async existsByRegistrationNumber(
    registrationNumber: RegistrationNumber,
    exceptLawyerId?: number,
  ): Promise<boolean> {
    return [...this.byId.values()].some(
      (lawyer) =>
        lawyer.id !== exceptLawyerId &&
        lawyer.registrationNumber.equals(registrationNumber),
    );
  }

  async create(lawyer: Lawyer): Promise<void> {
    this.byId.set(lawyer.id, lawyer);
  }

  async update(lawyer: Lawyer): Promise<void> {
    this.updates.push(lawyer);
    this.byId.set(lawyer.id, lawyer);
  }

  /**
   * A copy, like a row read from the database: a use case that changes the
   * lawyer and then rejects the request must not have changed what is stored.
   */
  async findById(id: number): Promise<Lawyer | null> {
    const stored = this.byId.get(id);
    return stored
      ? Lawyer.hydrate({
          id: stored.id,
          lastName: stored.lastName,
          firstName: stored.firstName,
          registrationNumber: stored.registrationNumber,
          active: stored.isActive(),
        })
      : null;
  }

  /**
   * Mirrors what `PrismaLawyerRepository.search` does in SQL: only
   * active lawyers, newest first, case-insensitive match on last name,
   * first names or registration number, then the page slice. Kept faithful on
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
          lawyer.lastName.toLowerCase().includes(needle) ||
          lawyer.firstName.toLowerCase().includes(needle) ||
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
 * In-memory {@link ActiveCasesCounterPort}. A spec sets the counts it wants in
 * `counts`; `calls` records every request, so a spec can assert the whole page
 * was asked for in **one** call and not one per row — the N+1 that the port's
 * batch shape exists to prevent.
 *
 * Honours the port's promise like the real adapter does: every requested id
 * comes back, with `0` when it has no count set.
 */
export class FakeActiveCasesCounter implements ActiveCasesCounterPort {
  readonly counts = new Map<number, number>();
  readonly calls = new Array<readonly number[]>();

  async countByResponsibleLawyer(
    lawyerIds: readonly number[],
  ): Promise<ReadonlyMap<number, number>> {
    return this.record(lawyerIds);
  }

  async countByClient(
    clientIds: readonly number[],
  ): Promise<ReadonlyMap<number, number>> {
    return this.record(clientIds);
  }

  /**
   * Lawyers and clients share `counts` and `calls`: no spec exercises both at
   * once, and one set of books makes an accidental crossover visible instead
   * of silently plausible.
   */
  private record(ids: readonly number[]): ReadonlyMap<number, number> {
    this.calls.push(ids);
    return new Map(ids.map((id) => [id, this.counts.get(id) ?? 0]));
  }
}

/**
 * Runs the work and, when it throws, undoes what the lawyer repository and
 * the audit trail recorded during it: the observable part of a rollback.
 * `open` tells the other fakes whether a write happens inside the
 * transaction, so a spec can assert that the change and its audit record are
 * one unit (CA-14.5).
 */
export class FakeTransactionManager implements TransactionManagerPort {
  open = false;
  calls = 0;

  constructor(
    private readonly lawyers?: FakeLawyerRepository,
    private readonly audit?: FakeAuditTrail,
  ) {}

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    this.calls++;
    const updatesBefore = this.lawyers?.updates.length ?? 0;
    const entriesBefore = this.audit?.entries.length ?? 0;
    this.open = true;
    try {
      return await work();
    } catch (error) {
      this.lawyers?.updates.splice(updatesBefore);
      this.audit?.entries.splice(entriesBefore);
      throw error;
    } finally {
      this.open = false;
    }
  }
}

/** Collects the audit records, and whether each was written inside a transaction. */
export class FakeAuditTrail implements AuditTrailPort {
  readonly entries: Array<AuditEntry & { inTransaction: boolean }> = [];
  failNextWith: Error | null = null;
  transactions?: FakeTransactionManager;

  async record(entry: AuditEntry): Promise<void> {
    if (this.failNextWith) {
      const error = this.failNextWith;
      this.failNextWith = null;
      throw error;
    }
    this.entries.push({ ...entry, inTransaction: this.transactions?.open ?? false });
  }
}

/** Collects what a use case publishes, and whether a transaction was still open. */
export class FakeEventPublisher extends EventPublisher {
  readonly published: Array<IntegrationEvent & { inTransaction?: boolean }> = [];
  transactions?: FakeTransactionManager;

  async publish(event: IntegrationEvent): Promise<void> {
    this.published.push({ ...event, inTransaction: this.transactions?.open ?? false });
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
