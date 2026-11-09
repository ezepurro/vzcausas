import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUDIT_TRAIL, AuditTrailPort } from '@shared/domain/audit-trail.port';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { TRANSACTION_MANAGER, TransactionManagerPort } from '@shared/domain/transaction-manager.port';
import { EventPublisher } from '@shared/infrastructure/events/event-publisher.port';
import { createEventHeader } from '@shared/infrastructure/events/integration-event';
import { Case } from '../../../domain/entities/case/case.entity';
import { CaseChanges, CaseModificationContext } from '../../../domain/entities/case/case-changes';
import { CaseNotFoundError, CaseSacAlreadyExistsError, NotResponsibleLawyerError } from '../../../domain/errors/case.errors';
import { CASE_FOLDER_STATE, CaseFolderStatePort } from '../../../domain/ports/case/case-folder-state.port';
import { CASE_REPOSITORY, CaseListItem, CaseRepository } from '../../../domain/ports/case/case.repository';
import { LEGAL_PARAMETERS_LOOKUP, LegalParametersLookupPort } from '../../../domain/ports/case/legal-parameters-lookup.port';
import { PEOPLE_LOOKUP, PeopleLookupPort } from '../../../domain/ports/case/people-lookup.port';
import { CASE_MODIFIED, CaseModifiedEvent } from '../../../domain/ports/events/case-modified.event';
import { CaseChangeSet } from '../../../domain/value-objects/case/case-change-set.vo';
import { JURISDICTION_FOLDER_LABEL } from '../../../domain/value-objects/case/jurisdiction-folder-label';
import { GetCase } from './get-case.use-case';

export interface UpdateCaseCommand {
  caseId: number;
  changes: CaseChanges;
  /** Who modifies: it decides whether they may (D-110) and goes to the audit record (CA-19.15). */
  actor: AuthenticatedUser;
}

/**
 * HU19 — corrects the data of a case (contract V5, `PATCH /cases/{caseId}`).
 *
 * Coordinates and decides nothing: what a valid change is belongs to
 * {@link Case.modify} and to each jurisdiction. Order of the checks, so a
 * rejected request writes nothing: the case exists (404) → the actor operates
 * it (403, D-110: not a lawyer who is not the responsible one) → what the
 * jurisdiction refuses (422) → the data, with the references looked up here
 * (400) → the SAC is not another active case's (409).
 *
 * The change and its audit record are written in one transaction. Moving or
 * renaming the Drive folder is announced **after** the commit and never fails
 * the request (CA-19.9, CA-19.10, D-104).
 */
@Injectable()
export class UpdateCase {
  private readonly logger = new Logger(UpdateCase.name);

  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(PEOPLE_LOOKUP) private readonly people: PeopleLookupPort,
    @Inject(LEGAL_PARAMETERS_LOOKUP) private readonly legalParameters: LegalParametersLookupPort,
    @Inject(CASE_FOLDER_STATE) private readonly folderState: CaseFolderStatePort,
    @Inject(AUDIT_TRAIL) private readonly auditTrail: AuditTrailPort,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManagerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly events: EventPublisher,
    private readonly getCase: GetCase,
  ) {}

  /**
   * @returns the whole case, as `GET /cases/{caseId}` shows it: the response is
   *   built by {@link GetCase}, not rebuilt here.
   * @throws {CaseNotFoundError} 404, also for a case given de baja (CA-19.14).
   * @throws {NotResponsibleLawyerError} 403, a lawyer who is not the responsible one (D-110).
   * @throws {CaseInTerminalStateError} 422 (CA-19.13).
   * @throws {ValidationError} 400.
   * @throws {CaseSacAlreadyExistsError} 409 (CA-19.5).
   */
  async execute(command: UpdateCaseCommand): Promise<CaseListItem> {
    const target = await this.cases.findById(command.caseId);
    if (!target || !target.active) {
      throw new CaseNotFoundError();
    }

    target.assertCanBeOperatedBy(command.actor, NotResponsibleLawyerError.FOR_MODIFYING_CASE);

    const changes = target.modify(command.changes, await this.contextFor(command.changes));

    if (target.sacNumber !== null && changes.fields.includes('sacNumber')) {
      if (await this.cases.existsBySacNumber(target.sacNumber, target.id)) {
        throw new CaseSacAlreadyExistsError();
      }
    }

    const now = this.clock.now();
    await this.transactions.runInTransaction(async () => {
      await this.cases.saveModification(target);
      await this.auditTrail.record({
        actorUserId: command.actor.userId,
        action: 'case.updated',
        entityType: 'Case',
        entityId: String(target.id),
        occurredAt: now,
        // The names of the fields, never their values (audit §4).
        metadata: { changedFields: [...changes.fields] },
      });
    });

    await this.announceFolderChanges(target, changes, now);

    return this.getCase.execute({ id: target.id });
  }

  /**
   * What the case cannot find out on its own: whether the lawyer
   * and the qualifications sent exist and are active. Only what was sent is
   * looked up, with the registration's messages (HU18).
   */
  private async contextFor(changes: CaseChanges): Promise<CaseModificationContext> {
    const referenceErrors: Record<string, string> = {};
    const requested = changes.legalQualifications ?? [];
    const [lawyer, qualifications] = await Promise.all([
      typeof changes.responsibleLawyerId === 'number'
        ? this.people.findActiveLawyerById(changes.responsibleLawyerId)
        : undefined,
      requested.length > 0
        ? this.legalParameters.findActiveQualificationsByIds(requested.map((item) => item.legalQualificationId))
        : [],
    ]);

    if (lawyer === null) {
      referenceErrors.responsibleLawyerId = 'No existe un abogado vigente con ese identificador.';
    }
    const distinctRequested = new Set(requested.map((item) => item.legalQualificationId));
    if (qualifications.length < distinctRequested.size) {
      referenceErrors.legalQualifications = 'Alguna calificación legal no existe o está dada de baja.';
    }

    return {
      today: this.clock.today(),
      now: this.clock.now(),
      referenceErrors,
      legalQualificationRefs: qualifications,
    };
  }

  /**
   * The folder follows the caption and the responsible lawyer (D-104). Only a
   * folder that exists can be moved, and the case is already saved: a failure
   * here is logged and the folder is corrected later (CA-19.10).
   */
  private async announceFolderChanges(target: Case, changes: CaseChangeSet, occurredAt: Date): Promise<void> {
    if (!changes.relocatesFolder()) {
      return;
    }
    try {
      const folder = await this.folderState.find(target.id);
      if (folder?.status !== 'CREATED') {
        return;
      }
      // A lawyer given de baja keeps their folder: look them up active or not.
      const lawyer = await this.people.findLawyerById(target.responsibleLawyerId);
      if (!lawyer) {
        throw new Error(`The lawyer ${target.responsibleLawyerId} of case ${target.id} does not exist.`);
      }
      const event: CaseModifiedEvent = {
        ...createEventHeader(CASE_MODIFIED, occurredAt),
        caseId: target.id,
        caption: target.caption,
        lawyer: { id: lawyer.id, lastName: lawyer.lastName, firstName: lawyer.firstName },
        jurisdiction: { id: target.jurisdictionId, label: JURISDICTION_FOLDER_LABEL[target.jurisdictionCode] },
        changed: changes.folderChanges(),
      };
      await this.events.publish(event);
    } catch (error) {
      this.logger.error(`Could not announce the folder change of case ${target.id}: ${String(error)}`);
    }
  }
}
