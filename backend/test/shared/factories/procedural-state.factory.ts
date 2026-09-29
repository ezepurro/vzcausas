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
      position: overrides.position ?? 1,
      timeLimitDays: overrides.timeLimitDays ?? 5,
      dayType: overrides.dayType === undefined ? 'BUSINESS' : overrides.dayType,
      terminal: overrides.terminal ?? false,
      isActive: overrides.isActive ?? true,
      jurisdictionId: jurisdiction.jurisdictionId,
    },
  });
}
