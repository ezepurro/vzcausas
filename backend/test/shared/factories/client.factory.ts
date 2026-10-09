import { fakerES as faker } from '@faker-js/faker';
import { getPrisma } from '../harness/test-app';

/**
 * Factory de clientes.
 *
 * - `createClient()` → PERSISTE un cliente vigente con DNI de 8 dígitos único.
 */
export interface CreateClientOverrides {
  lastName?: string;
  firstName?: string;
  dni?: string;
  phone?: string | null;
  email?: string | null;
  clientSince?: Date;
  active?: boolean;
}

let sequence = 0;

export async function createClient(overrides: CreateClientOverrides = {}) {
  sequence += 1;
  return getPrisma().client.create({
    data: {
      lastName: overrides.lastName ?? faker.person.lastName().toUpperCase(),
      firstName: overrides.firstName ?? faker.person.firstName(),
      dni: overrides.dni ?? String(30000000 + sequence),
      phone: overrides.phone === undefined ? '351 415-2288' : overrides.phone,
      email: overrides.email === undefined ? faker.internet.email().toLowerCase() : overrides.email,
      // Fecha civil: medianoche UTC, como se guarda una columna `date`.
      clientSince: overrides.clientSince ?? new Date('2021-03-12T00:00:00.000Z'),
      active: overrides.active ?? true,
    },
  });
}
