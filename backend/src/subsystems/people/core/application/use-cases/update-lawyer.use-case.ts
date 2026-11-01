import { Inject, Injectable } from "@nestjs/common";
import { AUDIT_TRAIL, AuditTrailPort } from "@shared/domain/audit-trail.port";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import { TRANSACTION_MANAGER, TransactionManagerPort } from "@shared/domain/transaction-manager.port";
import { EventPublisher } from "@shared/infrastructure/events/event-publisher.port";
import { createEventHeader } from "@shared/infrastructure/events/integration-event";
import { Lawyer, LawyerChanges } from "../../domain/entities/lawyer.entity";
import {
  LawyerNotFoundError,
  LawyerRegistrationAlreadyExistsError,
} from "../../domain/errors/people.errors";
import { LAWYER_RENAMED, LawyerRenamedEvent } from "../../domain/ports/events/lawyer-renamed.event";
import { LAWYER_REPOSITORY, LawyerRepository } from "../../domain/ports/lawyer.repository";
import { FindLawyerUseCase, LawyerView } from "./find-lawyer.use-case";

export type UpdateLawyerCommand = {
  lawyerId: number;
  changes: LawyerChanges;
  /** The administrator who modifies, for the audit record (CA-14.5). */
  actorUserId: number;
  /** The request's correlation id, to cross the audit record with the technical log. */
  correlationId?: string | null;
};

/**
 * HU14 — modifies a lawyer's last name, first names or registration number
 * (contract V5, `PATCH /lawyers/{lawyerId}`).
 *
 * Coordinates and decides nothing: what a valid change is belongs to
 * {@link Lawyer.update}. Order of the checks, so a rejected request writes
 * nothing: the lawyer exists (404) → the data (400) → the registration number
 * is not another lawyer's (409). The 403 comes earlier, from the
 * `lawyer:update` permission.
 *
 * The change and its audit record are written in one transaction (CA-14.5):
 * neither lands without the other. The rename is announced **after** the
 * commit (architecture §7.5): `documents` renames the lawyer's Drive folder
 * on its own time, and a Drive failure never undoes the modification
 * (CA-14.12, CA-14.13, D-104).
 */
@Injectable()
export class UpdateLawyerUseCase {
  constructor(
    @Inject(LAWYER_REPOSITORY) private readonly lawyers: LawyerRepository,
    @Inject(AUDIT_TRAIL) private readonly auditTrail: AuditTrailPort,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManagerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly events: EventPublisher,
    private readonly findLawyer: FindLawyerUseCase,
  ) {}

  /**
   * @returns the lawyer as `GET /lawyers/{lawyerId}` shows it, with
   *   `activeCases`: the response is built by {@link FindLawyerUseCase}, not
   *   rebuilt here.
   * @throws {LawyerNotFoundError} 404, also for a lawyer given de baja (CA-14.11).
   * @throws {ValidationError} 400 (CA-14.4, CA-14.8, CA-14.9, CA-14.10).
   * @throws {LawyerRegistrationAlreadyExistsError} 409 (CA-14.3).
   */
  async execute(command: UpdateLawyerCommand): Promise<LawyerView> {
    const lawyer = await this.lawyers.findById(command.lawyerId);
    // A lawyer given de baja does not exist for the client (RN12, §3.3).
    if (!lawyer || !lawyer.isActive()) {
      throw new LawyerNotFoundError(command.lawyerId);
    }

    const changes = lawyer.update(command.changes);

    if (
      changes.fields.includes("registrationNumber") &&
      (await this.lawyers.existsByRegistrationNumber(lawyer.registrationNumber, lawyer.id))
    ) {
      throw new LawyerRegistrationAlreadyExistsError();
    }

    const now = this.clock.now();
    await this.transactions.runInTransaction(async () => {
      await this.lawyers.update(lawyer);
      await this.auditTrail.record({
        actorUserId: command.actorUserId,
        action: "lawyer.updated",
        entityType: "Lawyer",
        entityId: String(lawyer.id),
        occurredAt: now,
        // The names of the fields, never their values (audit §4).
        metadata: { changedFields: [...changes.fields] },
        correlationId: command.correlationId ?? null,
      });
    });

    if (changes.renamesLawyer()) {
      await this.announceRename(lawyer, now);
    }

    // It was just read and saved: it exists.
    return (await this.findLawyer.execute({ id: lawyer.id }))!;
  }

  private async announceRename(lawyer: Lawyer, occurredAt: Date): Promise<void> {
    const event: LawyerRenamedEvent = {
      ...createEventHeader(LAWYER_RENAMED, occurredAt),
      lawyerId: lawyer.id,
      lastName: lawyer.lastName,
      firstName: lawyer.firstName,
    };
    await this.events.publish(event);
  }
}
