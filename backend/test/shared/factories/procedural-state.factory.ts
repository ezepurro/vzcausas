import { fakerES as faker } from '@faker-js/faker';
import { getPrisma } from '../harness/test-app';

/**
 * Factory de fueros y estados procesales.
 *
 * - `createJurisdiction()`    → PERSISTE un fuero (upsert por código).
 * - `createProceduralState()` → PERSISTE un estado procesal válido.
 *
 * `jurisdictions.name` guarda el código del contrato (`CRIMINAL`,
 * `ADMINISTRATIVE`, `AMPARO`), que es lo que asume `JurisdictionMapper`.
 */
export type JurisdictionCode = 'CRIMINAL' | 'ADMINISTRATIVE' | 'AMPARO';
export type DayTypeCode = 'BUSINESS' | 'CONSECUTIVE' | 'NONE';

export async function createJurisdiction(
  code: JurisdictionCode = 'CRIMINAL',
  dayTypeDefault: DayTypeCode = 'BUSINESS',
) {
  return getPrisma().jurisdiction.upsert({
    where: { name: code },
    update: {},
    create: { name: code, dayTypeDefault },
  });
}

export interface ProceduralStateOverrides {
  jurisdiction: JurisdictionCode;
  name: string;
  timeLimitDays: number;
  dayType: DayTypeCode;
  terminal: boolean;
  isActive: boolean;
}

// `procedural_states.name` es única por fuero entre los vigentes: el contador evita choques.
let sequence = 0;

/**
 * Por defecto, un estado que abre 5 días hábiles. Si se fija solo
 * `timeLimitDays: 0`, el tipo de día pasa a `NONE`: la base exige la
 * coherencia (`ck_procedural_states_day_type_matches_time_limit`).
 */
export async function createProceduralState(overrides: Partial<ProceduralStateOverrides> = {}) {
  const jurisdiction = await createJurisdiction(overrides.jurisdiction ?? 'CRIMINAL');
  sequence += 1;
  const timeLimitDays = overrides.timeLimitDays ?? 5;

  return getPrisma().proceduralState.create({
    data: {
      name: overrides.name ?? `${faker.lorem.words(3)} ${sequence}`,
      timeLimitDays,
      dayType: overrides.dayType ?? (timeLimitDays === 0 ? 'NONE' : 'BUSINESS'),
      terminal: overrides.terminal ?? false,
      isActive: overrides.isActive ?? true,
      jurisdictionId: jurisdiction.jurisdictionId,
    },
  });
}

/**
 * PERSISTE el estado inicial «Iniciada» de un fuero (con su fuero) si no
 * existe. Es el estado en el que nace toda causa. Idempotente: el seed ya lo
 * crea, pero otros specs borran los estados, así que quien lo necesita lo
 * asegura en su `beforeEach`.
 */
export async function createInitialState(code: JurisdictionCode = 'CRIMINAL') {
  const jurisdiction = await createJurisdiction(code);
  const existing = await getPrisma().proceduralState.findFirst({
    where: { jurisdictionId: jurisdiction.jurisdictionId, isInitial: true },
  });
  if (existing) return existing;

  return getPrisma().proceduralState.create({
    data: {
      name: 'Iniciada',
      timeLimitDays: 0,
      dayType: 'NONE',
      terminal: false,
      isInitial: true,
      jurisdictionId: jurisdiction.jurisdictionId,
    },
  });
}
