import { ClockPort } from '@shared/domain/clock.port';
import { TransactionManagerPort } from '@shared/domain/transaction-manager.port';
import { Case } from '../domain/entities/cases';
import { ProceduralAct } from '../domain/entities/procedural-act';
import { DeadlineCalculatorPort } from '../domain/ports/deadline-calculator.port';
import { CaseRepository } from '../domain/ports/case.repository';
import { ProceduralActRepository } from '../domain/ports/procedural-act.repository';
import {
  LegalParametersLookupPort,
  LegalQualificationRef,
  ProceduralStateRef,
} from '../domain/ports/legal-parameters-lookup.port';
import { ClientRef, LawyerRef, PeopleLookupPort } from '../domain/ports/people-lookup.port';
import { DayType } from '../domain/value-objects/day-type';
import { JurisdictionCode } from '../domain/value-objects/jurisdiction-code';

/**
 * In-memory fakes of the ports of `cases`, for the use case specs: no NestJS,
 * no database, no other subsystem.
 */

/**
 * In-memory {@link CaseRepository}. `states` plays the part of the
 * `procedural_states` table: `findCurrentState` looks the saved case's state up
 * there, as the real repository does with a join.
 */
export class FakeCaseRepository implements CaseRepository {
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

  constructor(private readonly states: ProceduralStateRef[]) {}

  /** Puts a case in the "database", as if it had been registered before. */
  add(existing: Case): void {
    this.saved.push(existing);
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

  async existsBySacNumber(sacNumber: string): Promise<boolean> {
    this.sacNumbersChecked.push(sacNumber);
    return this.takenSacNumbers.has(sacNumber);
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
export class FakeProceduralActRepository implements ProceduralActRepository {
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

/**
 * The four `countActiveBy*` methods of `CaseQueryPort`, for a spec that does
 * not use them: the three read use cases count nothing, and each one declares
 * its own double of the whole port.
 *
 * They **throw** instead of answering an empty map. A use case that starts
 * asking for a count has to fail here, loudly; a `0` would be
 * indistinguishable from "this id has no active cases" and the spec would keep
 * passing while the use case talked to a port that answers nothing.
 *
 * A spec that uses **one** of the four extends this and overrides that one:
 * the other three keep throwing, which is what proves the subject does not
 * reach for them. The parameters are declared, unused, so that an override can
 * carry the port's real signature — a method with no parameters cannot be
 * overridden by one that takes them.
 */
export abstract class CaseQueryCountsUnused {
  async countActiveByProceduralState(_stateIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    throw new Error('Este spec no usa el conteo por estado procesal de CaseQueryPort.');
  }

  async countActiveByLegalQualification(_qualificationIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    throw new Error('Este spec no usa el conteo por calificación legal de CaseQueryPort.');
  }

  async countActiveByResponsibleLawyer(_lawyerIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    throw new Error('Este spec no usa el conteo por abogado responsable de CaseQueryPort.');
  }

  async countActiveByClient(_clientIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    throw new Error('Este spec no usa el conteo por cliente de CaseQueryPort.');
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
