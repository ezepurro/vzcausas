import { fakerES as faker } from '@faker-js/faker';
import { getPrisma } from '../harness/test-app';

/**
 * Factory de clientes.
 *
 * - `createClient()` → PERSISTE un cliente vigente con DNI de 8 dígitos único,
 *                      dirección y teléfono (obligatorios en el alta, D-109).
 */
export interface CreateClientOverrides {
  lastName?: string;
  firstName?: string;
  documentType?: 'DNI' | 'PASSPORT';
  documentNumber?: string;
  address?: string;
  phone?: string;
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
      documentType: overrides.documentType ?? 'DNI',
      documentNumber: overrides.documentNumber ?? String(30000000 + sequence),
      address: overrides.address ?? 'Av. Rafael Núñez 4560, Córdoba',
      phone: overrides.phone ?? '351 415-2288',
      email: overrides.email === undefined ? faker.internet.email().toLowerCase() : overrides.email,
      // Fecha civil: medianoche UTC, como se guarda una columna `date`.
      clientSince: overrides.clientSince ?? new Date('2021-03-12T00:00:00.000Z'),
      active: overrides.active ?? true,
    },
  });
}
