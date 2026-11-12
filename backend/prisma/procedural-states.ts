import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Procedural states shared by the essential seed (`seed.ts`) and the
 * population script (`populate/populate.ts`).
 *
 * The `name` values stay in Spanish: they are legal terminology the firm
 * reads verbatim, not developer-facing strings.
 */

export type JurisdictionCode = 'CRIMINAL' | 'ADMINISTRATIVE' | 'AMPARO';

export interface StateSeed {
  jurisdiction: JurisdictionCode;
  name: string;
  timeLimitDays: number;
  dayType: 'NONE' | 'BUSINESS' | 'CONSECUTIVE';
  terminal: boolean;
  isInitial?: boolean;
  isPrescribed?: boolean;
}

export const INITIAL_STATE_NAME = 'Iniciada';
export const PRESCRIBED_STATE_NAME = 'Prescripta';

export const initialState = (jurisdiction: JurisdictionCode): StateSeed => ({
  jurisdiction,
  name: INITIAL_STATE_NAME,
  timeLimitDays: 0,
  dayType: 'NONE',
  terminal: false,
  isInitial: true,
});

/**
 * System "Prescripta" state of the criminal jurisdiction (D-53): terminal,
 * no time limit, protected against update and deletion. HU33 moves a case
 * here. The CHECK and the partial unique index of
 * `sprint3_manual_constraints` require exactly this shape.
 */
export const PRESCRIBED_STATE: StateSeed = {
  jurisdiction: 'CRIMINAL',
  name: PRESCRIBED_STATE_NAME,
  timeLimitDays: 0,
  dayType: 'NONE',
  terminal: true,
  isPrescribed: true,
};

/**
 * The states the application depends on by flag, in every environment:
 * "Iniciada" per jurisdiction (a new case starts there) and "Prescripta" in
 * CRIMINAL. No endpoint creates them. The rest of the table is the firm's
 * (RN4, RN5) and is loaded through the API; `populate/populate.ts` adds sample ones
 * in development.
 */
export const SYSTEM_STATES: readonly StateSeed[] = [
  initialState('CRIMINAL'),
  PRESCRIBED_STATE,
  initialState('ADMINISTRATIVE'),
  initialState('AMPARO'),
];

/**
 * Idempotent write of one state. `name` is not a unique key, so there is
 * nothing to upsert on: the row is looked up by the same rule the partial
 * unique index enforces (jurisdiction + case-insensitive name, active only).
 */
export async function upsertProceduralState(prisma: PrismaClient, seed: StateSeed): Promise<void> {
  const { jurisdiction: code, ...state } = seed;
  const jurisdiction = await prisma.jurisdiction.findUniqueOrThrow({ where: { name: code } });
  const data = { ...state, jurisdictionId: jurisdiction.jurisdictionId };

  const existing = await prisma.proceduralState.findFirst({
    where: {
      jurisdictionId: jurisdiction.jurisdictionId,
      name: { equals: state.name, mode: 'insensitive' },
      isActive: true,
    },
  });

  if (existing) {
    await prisma.proceduralState.update({ where: { stateId: existing.stateId }, data });
  } else {
    await prisma.proceduralState.create({ data });
  }
}
