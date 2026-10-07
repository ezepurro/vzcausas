import { ClockPort } from '@shared/domain/clock.port';
import { Case } from '../domain/entities/cases';
import { ProceduralAct } from '../domain/entities/procedural-act';
import { CriminalCase } from '../domain/entities/criminal';
import { DeadlineCalculatorPort } from '../domain/ports/deadline-calculator.port';
import { CaseRepository } from '../domain/ports/case.repository';
<<<<<<< HEAD
import {
  LegalParametersLookupPort,
  LegalQualificationRef,
  ProceduralStateRef,
} from '../domain/ports/legal-parameters-lookup.port';
import { ClientRef, LawyerRef, PeopleLookupPort } from '../domain/ports/people-lookup.port';
=======
import { ClientLookupPort, ClientRef } from '../domain/ports/client-lookup.port';
import { LawyerLookupPort, LawyerRef } from '../domain/ports/lawyer-lookup.port';
import { LegalQualificationLookupPort, LegalQualificationRef } from '../domain/ports/legal-qualification-lookup.port';
import { ProcStateLookupPort, ProceduralStateRef } from '../domain/ports/proc-state-lookup.port';
import { DayType } from '../domain/value-objects/day-type';
>>>>>>> 178097f (feat(back): register proc act - entities & usecase created)
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

  /** Acts saved with `saveProceduralAct`, in order. */
  readonly savedActs: ProceduralAct[] = [];
  /** The case as it was when each act was saved, for specs that check what `saveProceduralAct` received. */
  readonly casesWhenActSaved: { currentProceduralActId: number | null; currentStateId: number | null }[] = [];
  /** When set, `saveProceduralAct` fails with it. */
  failOnSaveActWith: Error | null = null;
  private nextActIdValue = 1;

  constructor(private readonly states: ProceduralStateRef[]) {}

  /** Puts a case in the "database", as if it had been registered before. */
  add(existing: Case): void {
    this.saved.push(existing);
  }

  async nextProceduralActId(): Promise<number> {
    return this.nextActIdValue++;
  }

  async saveProceduralAct(updatedCase: Case, act: ProceduralAct): Promise<void> {
    if (this.failOnSaveActWith) {
      throw this.failOnSaveActWith;
    }
    this.casesWhenActSaved.push({
      currentProceduralActId: updatedCase.currentProceduralActId,
      currentStateId: updatedCase.currentStateId,
    });
    this.savedActs.push(act);
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
    if (newCase instanceof CriminalCase) {
      this.prescriptionsWhenSaved = newCase.offenses.map((offense) => offense.prescriptionExpiresOn);
    }
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

<<<<<<< HEAD
/**
 * In-memory {@link PeopleLookupPort}. A lawyer or client that is not in the
 * lists does not exist or was deactivated.
 */
export class FakePeopleLookup implements PeopleLookupPort {
  constructor(
    private readonly activeLawyers: LawyerRef[],
    private readonly activeClients: ClientRef[],
  ) {}
=======
/** Initial states by jurisdiction. A jurisdiction without an entry has no initial state. */
export class FakeProcStateLookup implements ProcStateLookupPort {
  /** `states` is the table of the other states. */
  constructor(
    private readonly initialStates: Partial<Record<JurisdictionCode, ProceduralStateRef>>,
    private readonly states: ProceduralStateRef[] = [],
  ) {}

  async findById(id: number): Promise<ProceduralStateRef | null> {
    const all = [...Object.values(this.initialStates), ...this.states];
    return all.find((state) => state?.id === id) ?? null;
  }

  async existsActiveByName(jurisdictionId: number, name: string): Promise<boolean> {
    const all = [...Object.values(this.initialStates), ...this.states];
    return all.some(
      (state) =>
        state?.isActive && state.jurisdictionId === jurisdictionId && state.name.toLowerCase() === name.toLowerCase(),
    );
  }
>>>>>>> 178097f (feat(back): register proc act - entities & usecase created)

  async findActiveLawyerById(id: number): Promise<LawyerRef | null> {
    return this.activeLawyers.find((lawyer) => lawyer.id === id) ?? null;
  }

<<<<<<< HEAD
  async findActiveClientById(id: number): Promise<ClientRef | null> {
=======
/** Calculator that records its calls and answers a fixed number of days after the start date. */
export class FakeDeadlineCalculator implements DeadlineCalculatorPort {
  readonly calls: { countsFrom: Date; days: number; dayType: DayType }[] = [];

  async computeDueDate(countsFrom: Date, days: number, dayType: DayType): Promise<Date> {
    this.calls.push({ countsFrom, days, dayType });
    return new Date(countsFrom.getTime() + days * 24 * 60 * 60 * 1000);
  }
}

/** Active clients. One that is not in the list does not exist or was deactivated. */
export class FakeClientLookup implements ClientLookupPort {
  constructor(private readonly activeClients: ClientRef[]) {}

  async findActiveById(id: number): Promise<ClientRef | null> {
>>>>>>> 178097f (feat(back): register proc act - entities & usecase created)
    return this.activeClients.find((client) => client.id === id) ?? null;
  }
}

/**
 * In-memory {@link LegalParametersLookupPort}. A jurisdiction without an entry
 * in `initialStates` has no initial state; qualifications that are not in the
 * list are left out of the answer.
 */
export class FakeLegalParametersLookup implements LegalParametersLookupPort {
  constructor(
    private readonly initialStates: Partial<Record<JurisdictionCode, ProceduralStateRef>>,
    private readonly activeQualifications: LegalQualificationRef[],
  ) {}

  async findInitialProcStateByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralStateRef | null> {
    return this.initialStates[jurisdiction] ?? null;
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
