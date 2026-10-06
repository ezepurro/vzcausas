import { ClockPort } from '@shared/domain/clock.port';
import { Case } from '../domain/entities/cases';
import { CriminalCase } from '../domain/entities/criminal';
import { CaseRepository } from '../domain/ports/case.repository';
import { ClientLookupPort, ClientRef } from '../domain/ports/client-lookup.port';
import { CurrentDatePort } from '../domain/ports/current-date.port';
import { LawyerLookupPort, LawyerRef } from '../domain/ports/lawyer-lookup.port';
import { LegalQualificationLookupPort, LegalQualificationRef } from '../domain/ports/legal-qualification-lookup.port';
import { ProcStateLookupPort, ProceduralStateRef } from '../domain/ports/proc-state-lookup.port';
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

  constructor(private readonly states: ProceduralStateRef[]) {}

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

/** Initial states by jurisdiction. A jurisdiction without an entry has no initial state. */
export class FakeProcStateLookup implements ProcStateLookupPort {
  constructor(private readonly initialStates: Partial<Record<JurisdictionCode, ProceduralStateRef>>) {}

  async findInitialByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralStateRef | null> {
    return this.initialStates[jurisdiction] ?? null;
  }
}

/** Active clients. One that is not in the list does not exist or was deactivated. */
export class FakeClientLookup implements ClientLookupPort {
  constructor(private readonly activeClients: ClientRef[]) {}

  async findActiveById(id: number): Promise<ClientRef | null> {
    return this.activeClients.find((client) => client.id === id) ?? null;
  }
}

/** Active lawyers. One that is not in the list does not exist or was deactivated. */
export class FakeLawyerLookup implements LawyerLookupPort {
  constructor(private readonly activeLawyers: LawyerRef[]) {}

  async findActiveById(id: number): Promise<LawyerRef | null> {
    return this.activeLawyers.find((lawyer) => lawyer.id === id) ?? null;
  }
}

/** Active legal qualifications. Ids that are not in the list are left out of the answer. */
export class FakeLegalQualificationLookup implements LegalQualificationLookupPort {
  constructor(private readonly activeQualifications: LegalQualificationRef[]) {}

  async findActiveByIds(ids: number[]): Promise<LegalQualificationRef[]> {
    return this.activeQualifications.filter((qualification) => ids.includes(qualification.id));
  }
}

export class FakeCurrentDate implements CurrentDatePort {
  constructor(private readonly date: Date) {}

  today(): Date {
    return this.date;
  }
}

export class FakeClock implements ClockPort {
  constructor(private readonly instant: Date) {}

  now(): Date {
    return this.instant;
  }
}
