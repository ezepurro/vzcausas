import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ValidationError } from '@shared/domain/domain-error';
import { RegisterCaseCommand } from '../application/common/register-case.interfaces';
import { RegisterProceduralActCommand } from '../application/common/register-procedural-act.interfaces';
import { Case } from '../domain/entities/cases';
import { CriminalCase } from '../domain/entities/criminal';
import { ProceduralAct, ProceduralActProps } from '../domain/entities/procedural-act';
import { CaseFactory, NewCaseInput } from '../domain/factories/case.factory';
import { ClientRef, LawyerRef } from '../domain/ports/people-lookup.port';
import { LegalQualificationRef, ProceduralStateRef } from '../domain/ports/legal-parameters-lookup.port';
import { DayType } from '../domain/value-objects/day-type';
import { Deadline } from '../domain/value-objects/deadline';
import { JurisdictionCode } from '../domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../domain/value-objects/procedural-role';

/** A date at midnight UTC, the way a `date` column is read: `day('2026-09-01')`. */
export function day(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** The civil date of the study "today" in every spec. */
export const TODAY = day('2026-10-06');

/** The instant of creation in every spec. */
export const NOW = new Date('2026-10-06T15:30:00.000Z');

/** What the initial state has in common: not final, active and opening no term. */
const NEUTRAL_STATE = { terminal: false, isPrescribed: false, isActive: true, timeLimitDays: 0, dayType: DayType.NONE };

/** The initial state ("Iniciada") of each jurisdiction, as `legal-parameters` would hand it out. */
export const INITIAL_STATES: Record<JurisdictionCode, ProceduralStateRef> = {
  [JurisdictionCode.CRIMINAL]: { id: 11, name: 'Iniciada', isInitial: true, jurisdictionId: 1, ...NEUTRAL_STATE },
  [JurisdictionCode.ADMINISTRATIVE]: { id: 12, name: 'Iniciada', isInitial: true, jurisdictionId: 2, ...NEUTRAL_STATE },
  [JurisdictionCode.AMPARO]: { id: 13, name: 'Iniciada', isInitial: true, jurisdictionId: 3, ...NEUTRAL_STATE },
};

export const ROBBERY: LegalQualificationRef = { id: 1, name: 'Robo calificado', prescriptionMonths: 96 };
export const HOMICIDE: LegalQualificationRef = { id: 2, name: 'Homicidio simple', prescriptionMonths: 180 };

export const CLIENT: ClientRef = {
  id: 1,
  lastName: 'GÓMEZ',
  firstName: 'Ariel Fernando',
  dni: '34812905',
  phone: null,
  email: null,
  clientSince: day('2021-03-12'),
};

export const LAWYER: LawyerRef = { id: 2, lastName: 'Ríos', firstName: 'Malena', registrationNumber: '1-36842' };

/** Input for the factory: a valid criminal case with SAC, no qualifications. Override what the spec needs. */
export function aNewCaseInput(overrides: Partial<NewCaseInput> = {}): NewCaseInput {
  const jurisdictionCode = overrides.jurisdictionCode ?? JurisdictionCode.CRIMINAL;
  return {
    id: 1,
    jurisdictionCode,
    initialState: INITIAL_STATES[jurisdictionCode],
    sacNumber: '12345678',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    clientId: CLIENT.id,
    proceduralRole: ProceduralRole.DEFENSA,
    legalQualifications: [],
    legalQualificationRefs: [],
    responsibleLawyerId: LAWYER.id,
    startDate: day('2026-09-01'),
    createdByUserId: 5,
    today: TODAY,
    now: NOW,
    ...overrides,
  };
}

/** Command for the use case: a valid criminal case with SAC, no qualifications. Override what the spec needs. */
export function aRegisterCaseCommand(overrides: Partial<RegisterCaseCommand> = {}): RegisterCaseCommand {
  return {
    createdByUserId: 5,
    jurisdiction: JurisdictionCode.CRIMINAL,
    sacNumber: '12345678',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    clientId: CLIENT.id,
    proceduralRole: ProceduralRole.DEFENSA,
    responsibleLawyerId: LAWYER.id,
    startDate: day('2026-09-01'),
    ...overrides,
  };
}

/**
 * Runs something that must fail with a {@link ValidationError} and returns its
 * `details`, so a spec can check the exact message of each field.
 */
export async function validationDetailsOf(work: () => unknown): Promise<Record<string, unknown> | null> {
  try {
    await work();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe('VALIDATION_ERROR');
    return (error as ValidationError).details;
  }
  throw new Error('Expected a ValidationError, but nothing was thrown.');
}

// ─── Procedural acts (HU26) ──────────────────────────────────────────────────

/** A procedural state of the criminal table: active, not final, five business days. Override what the spec needs. */
export function aProceduralState(overrides: Partial<ProceduralStateRef> = {}): ProceduralStateRef {
  return {
    id: 21,
    name: 'Oposición al requerimiento de elevación',
    isInitial: false,
    jurisdictionId: 1,
    terminal: false,
    isPrescribed: false,
    isActive: true,
    timeLimitDays: 5,
    dayType: DayType.BUSINESS,
    ...overrides,
  };
}

export const OPPOSITION = aProceduralState();
export const SUMMONS = aProceduralState({
  id: 22,
  name: 'Citación a juicio',
  timeLimitDays: 10,
  dayType: DayType.CONSECUTIVE,
});
export const WITHOUT_TERM = aProceduralState({ id: 23, name: 'Con vista al fiscal', timeLimitDays: 0, dayType: DayType.NONE });
export const ARCHIVED = aProceduralState({
  id: 24,
  name: 'Archivada',
  terminal: true,
  timeLimitDays: 0,
  dayType: DayType.NONE,
});
export const DEACTIVATED = aProceduralState({ id: 25, name: 'Estado dado de baja', isActive: false });
/** The system state of HU33: terminal, but never the target of an act (D-69). */
export const PRESCRIBED = aProceduralState({
  id: 26,
  name: 'Prescripta',
  terminal: true,
  isPrescribed: true,
  timeLimitDays: 0,
  dayType: DayType.NONE,
});
export const ADMINISTRATIVE_STATE = aProceduralState({ id: 31, name: 'Presentación de descargo', jurisdictionId: 2, timeLimitDays: 10 });

/** The states of the table that the specs of the procedural acts share (besides the initial ones). */
export const STATES_TABLE: ProceduralStateRef[] = [
  OPPOSITION,
  SUMMONS,
  WITHOUT_TERM,
  ARCHIVED,
  DEACTIVATED,
  PRESCRIBED,
  ADMINISTRATIVE_STATE,
];

/** The user that registers: a lawyer, in charge of the cases of the fixtures (`LAWYER`). */
export function anActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return { userId: 5, roleNames: ['LAWYER'], lawyerId: LAWYER.id, permissions: [], ...overrides };
}

/** A criminal case in the initial state ("Iniciada"), the way the registration leaves it. */
export function aCase(overrides: Partial<NewCaseInput> = {}): Case {
  return CaseFactory.create(aNewCaseInput(overrides));
}

/** An administrative case in the initial state. */
export function anAdministrativeCase(overrides: Partial<NewCaseInput> = {}): Case {
  return aCase({
    jurisdictionCode: JurisdictionCode.ADMINISTRATIVE,
    proceduralRole: ProceduralRole.RECURRENTE,
    subjectMatter: 'Se impugna la resolución que deniega la cobertura.',
    ...overrides,
  });
}

/** An act already on record, with a five business days deadline counted from its date. */
export function anAct(overrides: Partial<ProceduralActProps> = {}): ProceduralAct {
  const actDate = overrides.actDate ?? day('2026-09-30');
  return ProceduralAct.hydrate({
    id: 1,
    caseId: 1,
    proceduralStateId: OPPOSITION.id,
    customState: null,
    actDate,
    notificationDate: null,
    notes: null,
    deadline: Deadline.hydrate({
      timeLimitDays: 5,
      dayType: DayType.BUSINESS,
      countsFrom: actDate,
      computedDueDate: day('2026-10-07'),
      manualDueDate: null,
    }),
    registeredByUserId: 5,
    registeredByLawyerId: LAWYER.id,
    registeredAt: NOW,
    ...overrides,
  });
}

/**
 * A criminal case that is already past the initial state: it is in the state of
 * its current act (or in `currentStateId`, if there is no act, for a case in a final state).
 */
export function aCaseInState(
  options: { currentAct?: ProceduralAct; currentStateId?: number; currentActNotLoaded?: boolean } = {},
): Case {
  const act = options.currentAct;
  const currentStateId = act ? act.proceduralStateId : (options.currentStateId ?? INITIAL_STATES.CRIMINAL.id);
  // The table of the specs tells whether that state closes the case; a hand-written state never does.
  const currentStateTerminal = STATES_TABLE.find((state) => state.id === currentStateId)?.terminal ?? false;
  return CriminalCase.hydrate({
    id: 1,
    sacNumber: '12345678',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    court: null,
    jurisdictionId: 1,
    proceduralRole: ProceduralRole.DEFENSA,
    instructor: { name: null, phone: null, extension: null },
    clientId: CLIENT.id,
    responsibleLawyerId: LAWYER.id,
    startDate: day('2026-09-01'),
    courtFeePaid: false,
    currentStateId,
    currentCustomState: act ? act.customState : null,
    currentProceduralActId: act ? act.id : null,
    currentStateTerminal,
    proceduralActs: act && !options.currentActNotLoaded ? [act] : [],
    active: true,
    createdByUserId: 5,
    createdAt: NOW,
    updatedAt: NOW,
    offenses: [],
    clientDetained: false,
    prescriptionDeclaration: null,
  });
}

/** Command to register an act on case 1: a state of the table, dated before today. Override what the spec needs. */
export function aRegisterProceduralActCommand(
  overrides: Partial<RegisterProceduralActCommand> = {},
): RegisterProceduralActCommand {
  return {
    caseId: 1,
    actor: anActor(),
    proceduralStateId: OPPOSITION.id,
    actDate: day('2026-10-05'),
    ...overrides,
  };
}
