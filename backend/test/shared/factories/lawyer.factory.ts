import { fakerES as faker } from '@faker-js/faker';
import { getPrisma } from '../harness/test-app';

/**
 * Factory de abogados.
 *
 * - `createLawyer()` → PERSISTE un abogado vigente con matrícula única
 *                      (formato `circunscripción-número`, ej. `1-28114`).
 */
export interface CreateLawyerOverrides {
  lastName?: string;
  firstName?: string;
  registrationNumber?: string;
  active?: boolean;
}

let sequence = 0;

export async function createLawyer(overrides: CreateLawyerOverrides = {}) {
  sequence += 1;
  return getPrisma().lawyer.create({
    data: {
      lastName: overrides.lastName ?? faker.person.lastName(),
      firstName: overrides.firstName ?? faker.person.firstName(),
      registrationNumber: overrides.registrationNumber ?? `1-${10000 + sequence}`,
      active: overrides.active ?? true,
    },
  });
}
