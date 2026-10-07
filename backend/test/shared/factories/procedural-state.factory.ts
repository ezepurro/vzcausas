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
  position: number;
  timeLimitDays: number;
  dayType: DayTypeCode | null;
  terminal: boolean;
  isActive: boolean;
}

// `procedural_states.name` es única a nivel global: el contador evita choques.
let sequence = 0;

export async function createProceduralState(overrides: Partial<ProceduralStateOverrides> = {}) {
  const jurisdiction = await createJurisdiction(overrides.jurisdiction ?? 'CRIMINAL');
  sequence += 1;

  return getPrisma().proceduralState.create({
    data: {
      name: overrides.name ?? `${faker.lorem.words(3)} ${sequence}`,
      timeLimitDays: overrides.timeLimitDays ?? 5,
      dayType: overrides.dayType ?? 'BUSINESS',
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
