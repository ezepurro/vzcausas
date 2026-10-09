import { ValidationError } from '@shared/domain/domain-error';
import { RegisterCaseCommand } from '../application/common/register-case.interfaces';
import { NewCaseInput } from '../domain/factories/case.factory';
import { ClientRef, LawyerRef } from '../domain/ports/people-lookup.port';
import { LegalQualificationRef, ProceduralStateRef } from '../domain/ports/legal-parameters-lookup.port';
import { DayType } from '../domain/value-objects/day-type';
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
const NEUTRAL_STATE = { terminal: false, isActive: true, timeLimitDays: 0, dayType: DayType.NONE };

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

export const LAWYER: LawyerRef = { id: 2, fullName: 'Dra. Malena Ríos', registrationNumber: '1-36842' };

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
