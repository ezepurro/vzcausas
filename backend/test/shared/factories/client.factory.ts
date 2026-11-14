import { fakerES as faker } from '@faker-js/faker';
import { getPrisma } from '../harness/test-app';

/**
 * Factory de clientes.
 *
 * - `createClient()` → PERSISTE un cliente vigente con DNI de 8 dígitos único,
 *                      dirección y teléfono (obligatorios en el alta, D-109).
 * - `deactivateClient()` → lo da de baja con quién y cuándo (HU11).
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
}

let sequence = 0;

/**
 * Da de baja un cliente ya persistido, como lo deja `DELETE /clients/{clientId}`
 * (HU11). `ck_clients_deactivation_coherent` exige fecha y usuario de la baja
 * junto con `active: false`: poner solo `active: false` ya no pasa.
 */
export async function deactivateClient(clientId: number, byUserId: number) {
  return getPrisma().client.update({
    where: { id: clientId },
    data: { active: false, deactivatedAt: new Date(), deactivatedByUserId: byUserId },
  });
}

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
      // Vigente: para uno dado de baja, `deactivateClient` (la baja exige quién y cuándo).
      active: true,
    },
  });
}
