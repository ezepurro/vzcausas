import { AuditEntry, AuditTrailPort } from '@shared/domain/audit-trail.port';
import { ClockPort } from '@shared/domain/clock.port';
import { TransactionManagerPort } from '@shared/domain/transaction-manager.port';
import { Case } from '../domain/entities/case/case.entity';
import { CaseSnapshot } from '../domain/entities/case/case-snapshot';
import { InterruptiveAct } from '../domain/entities/interruptive-act.entity';
import { ProceduralAct } from '../domain/entities/procedural-act.entity';
import { DeadlineCalculatorPort } from '../domain/ports/procedural-act/deadline-calculator.port';
import { CaseDueDateKey, CaseListItem, CaseRepository, CaseSearchFilters } from '../domain/ports/case/case.repository';
import { InterruptiveActPage, InterruptiveActRepository } from '../domain/ports/interruptive-act/interruptive-act.repository';
import { ProceduralActPage, ProceduralActRepository, ProceduralActView } from '../domain/ports/procedural-act/procedural-act.repository';
import {
  LegalParametersLookupPort,
  LegalQualificationRef,
  ProceduralStateRef,
} from '../domain/ports/case/legal-parameters-lookup.port';
import { ClientRef, LawyerRef, PeopleLookupPort } from '../domain/ports/case/people-lookup.port';
import { DayType } from '../domain/value-objects/deadline/day-type';
import { JurisdictionCode } from '../domain/value-objects/case/jurisdiction-code';

/**
 * In-memory fakes of the ports of `cases`, for the use case specs: no NestJS,
 * no database, no other subsystem.
 */

/**
 * Every method of `CaseRepository`, for a spec that does not use them: each
 * double extends this and overrides only what its subject calls.
 *
 * They **throw** instead of answering something empty. A use case that starts
 * asking for something new has to fail here, loudly; an empty answer (a `0`, a
 * `null`) would be indistinguishable from real data and the spec would keep
 * passing while the use case talked to a port that answers nothing. The
 * methods a double does not override are what prove the subject does not
 * reach for them.
 *
 * The parameters are declared, unused, so that an override can carry the
 * port's real signature — a method with no parameters cannot be overridden by
 * one that takes them.
 */
export abstract class UnusedCaseRepository implements CaseRepository {
  async nextId(): Promise<number> {
    throw new Error('Este spec no usa nextId de CaseRepository.');
  }

  async existsBySacNumber(_sacNumber: string, _exceptCaseId?: number): Promise<boolean> {
    throw new Error('Este spec no usa existsBySacNumber de CaseRepository.');
  }

  async save(_newCase: Case): Promise<void> {
    throw new Error('Este spec no usa save de CaseRepository.');
  }

  async saveModification(_modifiedCase: Case): Promise<void> {
    throw new Error('Este spec no usa saveModification de CaseRepository.');
  }

  async findById(_id: number): Promise<Case | null> {
    throw new Error('Este spec no usa findById de CaseRepository.');
  }

  async findCurrentState(_caseId: number): Promise<ProceduralStateRef> {
    throw new Error('Este spec no usa findCurrentState de CaseRepository.');
  }

  async saveCurrentAct(_updatedCase: Case): Promise<void> {
    throw new Error('Este spec no usa saveCurrentAct de CaseRepository.');
  }

  async saveDeclaredPrescription(_prescribedCase: Case): Promise<boolean> {
    throw new Error('Este spec no usa saveDeclaredPrescription de CaseRepository.');
  }

  async saveDeactivation(_deactivatedCase: Case): Promise<boolean> {
    throw new Error('Este spec no usa saveDeactivation de CaseRepository.');
  }

  async findDueDateKeys(_filters: CaseSearchFilters): Promise<CaseDueDateKey[]> {
    throw new Error('Este spec no usa findDueDateKeys de CaseRepository.');
  }

  async findListItemsByIds(_ids: readonly number[]): Promise<CaseListItem[]> {
    throw new Error('Este spec no usa findListItemsByIds de CaseRepository.');
  }

  async findListItemById(_id: number): Promise<CaseListItem | null> {
    throw new Error('Este spec no usa findListItemById de CaseRepository.');
  }

  async listCustomStates(_jurisdiction?: JurisdictionCode): Promise<string[]> {
    throw new Error('Este spec no usa listCustomStates de CaseRepository.');
  }

  async countActiveByProceduralState(_stateIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    throw new Error('Este spec no usa el conteo por estado procesal de CaseRepository.');
  }

  async countActiveByLegalQualification(_qualificationIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    throw new Error('Este spec no usa el conteo por calificación legal de CaseRepository.');
  }

  async countActiveByResponsibleLawyer(_lawyerIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    throw new Error('Este spec no usa el conteo por abogado responsable de CaseRepository.');
  }

  async countActiveByClient(_clientIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    throw new Error('Este spec no usa el conteo por cliente de CaseRepository.');
  }
}

/** Every method of `ProceduralActRepository`, throwing. Same idea as {@link UnusedCaseRepository}. */
export abstract class UnusedProceduralActRepository implements ProceduralActRepository {
  async nextId(): Promise<number> {
    throw new Error('Este spec no usa nextId de ProceduralActRepository.');
  }

  async save(_act: ProceduralAct): Promise<void> {
    throw new Error('Este spec no usa save de ProceduralActRepository.');
  }

  async caseExists(_caseId: number): Promise<boolean> {
    throw new Error('Este spec no usa caseExists de ProceduralActRepository.');
  }

  async listByCase(_caseId: number, _page: number, _limit: number): Promise<ProceduralActPage> {
    throw new Error('Este spec no usa listByCase de ProceduralActRepository.');
  }

  async findInCase(_caseId: number, _actId: number): Promise<ProceduralActView | null> {
    throw new Error('Este spec no usa findInCase de ProceduralActRepository.');
  }

  async saveModification(_act: ProceduralAct): Promise<void> {
    throw new Error('Este spec no usa saveModification de ProceduralActRepository.');
  }

  async findLatestInCaseExcept(_caseId: number, _exceptActId: number): Promise<ProceduralAct | null> {
    throw new Error('Este spec no usa findLatestInCaseExcept de ProceduralActRepository.');
  }
}

/** Every method of `InterruptiveActRepository`, throwing. Same idea as {@link UnusedCaseRepository}. */
export abstract class UnusedInterruptiveActRepository implements InterruptiveActRepository {
  async nextId(): Promise<number> {
    throw new Error('Este spec no usa nextId de InterruptiveActRepository.');
  }

  async save(_act: InterruptiveAct): Promise<void> {
    throw new Error('Este spec no usa save de InterruptiveActRepository.');
  }

  async caseExists(_caseId: number): Promise<boolean> {
    throw new Error('Este spec no usa caseExists de InterruptiveActRepository.');
  }

  async listByCase(_caseId: number, _page: number, _limit: number): Promise<InterruptiveActPage> {
    throw new Error('Este spec no usa listByCase de InterruptiveActRepository.');
  }
}

/**
 * In-memory {@link CaseRepository}. `states` plays the part of the
 * `procedural_states` table: `findCurrentState` looks the saved case's state up
 * there, as the real repository does with a join.
 */
export class FakeCaseRepository extends UnusedCaseRepository {
  private nextIdValue = 1;
  readonly saved: Case[] = [];
  /** SAC numbers that already exist in the "database", with or without a saved case. */
  readonly takenSacNumbers = new Set<string>();
  /** Every SAC number the use case asked about. */
  readonly sacNumbersChecked: string[] = [];
  /** The prescription date of each offense at the instant `save` ran, in order. */
  prescriptionsWhenSaved: (Date | null)[] = [];
  /** When set, `save` fails with it. */
  failOnSaveWith: Error | null = null;

  /** What `saveCurrentAct` received, in order: the pointers of the case to its current act. */
  readonly currentActUpdates: {
    currentProceduralActId: number | null;
    currentStateId: number | null;
    currentCustomState: string | null;
  }[] = [];
  /** When set, `saveCurrentAct` fails with it. */
  failOnSaveCurrentActWith: Error | null = null;

  /** The cases `saveDeclaredPrescription` wrote, in order. */
  readonly declaredPrescriptions: Case[] = [];
  /** When `true`, `saveDeclaredPrescription` finds the case already marked: another marking won. */
  prescriptionAlreadyDeclaredOnSave = false;

  constructor(private readonly states: ProceduralStateRef[]) {
    super();
  }

  /** Puts a case in the "database", as if it had been registered before. */
  add(existing: Case): void {
    this.saved.push(existing);
  }

  async saveDeclaredPrescription(prescribedCase: Case): Promise<boolean> {
    if (this.prescriptionAlreadyDeclaredOnSave) {
      return false;
    }
    this.declaredPrescriptions.push(prescribedCase);
    return true;
  }

  async saveCurrentAct(updatedCase: Case): Promise<void> {
    if (this.failOnSaveCurrentActWith) {
      throw this.failOnSaveCurrentActWith;
    }
    this.currentActUpdates.push({
      currentProceduralActId: updatedCase.currentProceduralActId,
      currentStateId: updatedCase.currentStateId,
      currentCustomState: updatedCase.currentCustomState,
    });
  }

  async nextId(): Promise<number> {
    return this.nextIdValue++;
  }

  /** `takenSacNumbers` belong to **other** active cases, so `exceptCaseId` changes nothing here. */
  async existsBySacNumber(sacNumber: string, _exceptCaseId?: number): Promise<boolean> {
    this.sacNumbersChecked.push(sacNumber);
    return this.takenSacNumbers.has(sacNumber);
  }

  /** The cases `saveModification` wrote, as snapshots taken at that instant (HU19). */
  readonly modifications: CaseSnapshot[] = [];

  async saveModification(modifiedCase: Case): Promise<void> {
    this.modifications.push(modifiedCase.toSnapshot());
  }

  /** The cases `saveDeactivation` wrote, in order (HU21). */
  readonly deactivations: Case[] = [];
  /** When `true`, `saveDeactivation` finds the case already given de baja: another baja won. */
  alreadyDeactivatedOnSave = false;

  async saveDeactivation(deactivatedCase: Case): Promise<boolean> {
    if (this.alreadyDeactivatedOnSave) {
      return false;
    }
    this.deactivations.push(deactivatedCase);
    return true;
  }

  async save(newCase: Case): Promise<void> {
    if (this.failOnSaveWith) {
      throw this.failOnSaveWith;
    }
    this.prescriptionsWhenSaved = newCase.toSnapshot().offenses.map((offense) => offense.prescriptionExpiresOn);
    this.saved.push(newCase);
  }

  async findById(id: number): Promise<Case | null> {
    return this.saved.find((saved) => saved.id === id) ?? null;
  }

  async findCurrentState(caseId: number): Promise<ProceduralStateRef> {
    const stored = this.saved.find((saved) => saved.id === caseId);
    const state = this.states.find((candidate) => candidate.id === stored?.currentStateId);
    if (!state) {
      throw new Error(`The case ${caseId} has no procedural state.`);
    }
    return state;
  }
}

/**
 * In-memory {@link PeopleLookupPort}. A lawyer or client that is not in the
 * active lists does not exist or was deactivated; `deactivatedLawyers` are the
 * ones that exist but were given de baja.
 */
export class FakePeopleLookup implements PeopleLookupPort {
  constructor(
    private readonly activeLawyers: LawyerRef[],
    private readonly activeClients: ClientRef[],
    private readonly deactivatedLawyers: LawyerRef[] = [],
  ) {}

  async findLawyerById(id: number): Promise<LawyerRef | null> {
    return (
      [...this.activeLawyers, ...this.deactivatedLawyers].find((lawyer) => lawyer.id === id) ?? null
    );
  }

  async findActiveLawyerById(id: number): Promise<LawyerRef | null> {
    return this.activeLawyers.find((lawyer) => lawyer.id === id) ?? null;
  }

  async findActiveClientById(id: number): Promise<ClientRef | null> {
    return this.activeClients.find((client) => client.id === id) ?? null;
  }
}

/** In-memory {@link ProceduralActRepository}. */
export class FakeProceduralActRepository extends UnusedProceduralActRepository {
  private nextIdValue = 1;
  readonly saved: ProceduralAct[] = [];
  /** When set, `save` fails with it. */
  failOnSaveWith: Error | null = null;

  async nextId(): Promise<number> {
    return this.nextIdValue++;
  }

  async save(act: ProceduralAct): Promise<void> {
    if (this.failOnSaveWith) {
      throw this.failOnSaveWith;
    }
    this.saved.push(act);
  }

  /** The acts already on record, as `findInCase` answers them (HU28). */
  readonly views: ProceduralActView[] = [];
  /** What `saveModification` received, in order (HU28). */
  readonly modifications: ProceduralAct[] = [];
  /** What `findLatestInCaseExcept` answers: the most recent of the other acts. */
  latestOther: ProceduralAct | null = null;

  async findInCase(caseId: number, actId: number): Promise<ProceduralActView | null> {
    return this.views.find((view) => view.act.caseId === caseId && view.act.id === actId) ?? null;
  }

  async saveModification(act: ProceduralAct): Promise<void> {
    this.modifications.push(act);
  }

  async findLatestInCaseExcept(_caseId: number, _exceptActId: number): Promise<ProceduralAct | null> {
    return this.latestOther;
  }
}

/**
 * {@link TransactionManagerPort} that runs the work as it is and counts the
 * runs. It does not undo anything: a spec that checks atomicity looks at what
 * the fakes received before the failure.
 */
export class FakeTransactionManager implements TransactionManagerPort {
  calls = 0;

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    this.calls++;
    return work();
  }
}

/** Collects the audit records (HU19). `failNextWith` makes the next one fail, to check nothing else is announced. */
export class FakeAuditTrail implements AuditTrailPort {
  readonly entries: AuditEntry[] = [];
  failNextWith: Error | null = null;

  async record(entry: AuditEntry): Promise<void> {
    if (this.failNextWith) {
      const error = this.failNextWith;
      this.failNextWith = null;
      throw error;
    }
    this.entries.push(entry);
  }
}

/** Calculator that records its calls and answers a fixed number of days after the start date. */
export class FakeDeadlineCalculator implements DeadlineCalculatorPort {
  readonly calls: { countsFrom: Date; days: number; dayType: DayType }[] = [];
  /** What `businessDaysUntil` answers, so a spec does not depend on the calendar. */
  businessDaysRemaining = 3;
  /** Every pair of dates `businessDaysUntil` was asked about. */
  readonly businessDaysCalls: { from: Date; to: Date }[] = [];

  async computeDueDate(countsFrom: Date, days: number, dayType: DayType): Promise<Date> {
    this.calls.push({ countsFrom, days, dayType });
    return new Date(countsFrom.getTime() + days * 24 * 60 * 60 * 1000);
  }

  async businessDaysUntil(from: Date, to: Date): Promise<number> {
    this.businessDaysCalls.push({ from, to });
    return this.businessDaysRemaining;
  }
}

/**
 * In-memory {@link LegalParametersLookupPort}. A jurisdiction without an entry
 * in `initialStates` has no initial state; qualifications that are not in the
 * list are left out of the answer. `states` is the table of the other states
 * (the initial ones are always part of it).
 */
export class FakeLegalParametersLookup implements LegalParametersLookupPort {
  constructor(
    private readonly initialStates: Partial<Record<JurisdictionCode, ProceduralStateRef>>,
    private readonly activeQualifications: LegalQualificationRef[],
    private readonly states: ProceduralStateRef[] = [],
  ) {}

  async findInitialProcStateByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralStateRef | null> {
    return this.initialStates[jurisdiction] ?? null;
  }

  async findProcStateById(id: number): Promise<ProceduralStateRef | null> {
    return this.allStates().find((state) => state.id === id) ?? null;
  }

  async findPrescribedProcStateByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralStateRef | null> {
    const jurisdictionId = this.initialStates[jurisdiction]?.jurisdictionId;
    return this.states.find((state) => state.isPrescribed && state.jurisdictionId === jurisdictionId) ?? null;
  }

  async existsProcStateActiveByName(jurisdictionId: number, name: string): Promise<boolean> {
    return this.allStates().some(
      (state) =>
        state.isActive && state.jurisdictionId === jurisdictionId && state.name.toLowerCase() === name.toLowerCase(),
    );
  }

  private allStates(): ProceduralStateRef[] {
    return [...Object.values(this.initialStates), ...this.states];
  }

  async findActiveQualificationsByIds(ids: number[]): Promise<LegalQualificationRef[]> {
    return this.activeQualifications.filter((qualification) => ids.includes(qualification.id));
  }
}

export class FakeClock implements ClockPort {
  constructor(
    private readonly instant: Date,
    private readonly date: Date,
  ) {}

  now(): Date {
    return this.instant;
  }

  today(): Date {
    return this.date;
  }
}
