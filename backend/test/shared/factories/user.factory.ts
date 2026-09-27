import { fakerES as faker } from '@faker-js/faker';
import { getPrisma } from '../harness/test-app';

/**
 * Factory de usuarios. Dos funciones por entidad, siempre con la misma forma:
 *
 * - `aUserBody()`  → arma el CUERPO de una petición HTTP (no toca la base).
 *                   Se usa para los POST / PATCH que se quieren probar.
 * - `createUser()` → PERSISTE un usuario directo con Prisma. Se usa para
 *                   preparar el estado previo ("dado que existe un usuario…").
 *
 * Los valores son válidos y aleatorios por defecto; el test solo fija
 * (con `overrides`) los campos que le importan.
 *
 * ⚠️ El modelo `User` de schema.prisma todavía no tiene `username` y usa
 * ids UUID, mientras que API_CONTRACT_V2 exige `username` e ids enteros.
 * Ajustar esta factory cuando se resuelva esa diferencia.
 */
export interface UserBody {
  username: string;
  fullName: string;
  email: string;
  password: string;
  roles: string[];
}

export function aUserBody(overrides: Partial<UserBody> = {}): UserBody {
  return {
    username: faker.internet.username().replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 30).padEnd(3, 'x'),
    fullName: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    password: 'password1',
    roles: ['SECRETARY'],
    ...overrides,
  };
}

export async function createUser(
  overrides: Partial<{ name: string; email: string; passwordHash: string; active: boolean }> = {},
) {
  return getPrisma().user.create({
    data: {
      name: overrides.name ?? faker.person.fullName(),
      email: overrides.email ?? faker.internet.email().toLowerCase(),
      // Valor fijo que NO es un hash bcrypt válido: alcanza para los tests que
      // no prueban el login. Para probar el login, pasar un hash real.
      passwordHash: overrides.passwordHash ?? 'hash-no-valido-solo-para-tests',
      active: overrides.active ?? true,
    },
  });
}
