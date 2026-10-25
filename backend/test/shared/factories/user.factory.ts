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
 */
export interface UserBody {
  username: string;
  lastName: string;
  firstName: string;
  email: string;
  password: string;
  roles: string[];
}

/**
 * El `username` se genera dentro del formato que valida el value object:
 * 3–30 caracteres de `[a-z0-9._-]`, ya en minúsculas. Generarlo fuera de
 * ese rango haría fallar tests por el dato de prueba y no por lo que
 * intentan verificar.
 */
function aUsername(): string {
  const raw = faker.internet
    .username()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');

  return raw.slice(0, 30).padEnd(3, 'x');
}

export function aUserBody(overrides: Partial<UserBody> = {}): UserBody {
  return {
    username: aUsername(),
    lastName: faker.person.lastName(),
    firstName: faker.person.firstName(),
    email: faker.internet.email().toLowerCase(),
    password: 'password1',
    roles: ['SECRETARY'],
    ...overrides,
  };
}

export interface CreateUserOverrides {
  username?: string;
  lastName?: string;
  firstName?: string;
  email?: string;
  passwordHash?: string;
  active?: boolean;
  /** Nombres de rol; deben existir en el catálogo que siembra `prisma/seed.ts`. */
  roles?: string[];
  lawyerId?: number | null;
}

/**
 * Persiste un usuario y lo vincula con sus roles a través de la tabla
 * puente `user_roles`.
 *
 * Los roles se referencian por nombre y no por id: el id es un detalle
 * del seed, y un test que hardcodea `roleId: 1` se rompe en silencio si
 * el orden del catálogo cambia. Si el rol no está sembrado, esto falla
 * de entrada con un mensaje claro en vez de dejar un usuario sin roles
 * que después produce un 500 al iniciar sesión.
 */
export async function createUser(overrides: CreateUserOverrides = {}) {
  const prisma = getPrisma();
  const roleNames = overrides.roles ?? ['SECRETARY'];

  const roles = await prisma.role.findMany({
    where: { name: { in: roleNames } },
  });

  if (roles.length !== roleNames.length) {
    const found = roles.map((r) => r.name);
    const missing = roleNames.filter((name) => !found.includes(name));
    throw new Error(
      `Roles inexistentes en la base de test: ${missing.join(', ')}. ` +
        'Verificá que `prisma/seed.ts` haya corrido en el global setup.',
    );
  }

  return prisma.user.create({
    data: {
      username: overrides.username ?? aUsername(),
      lastName: overrides.lastName ?? faker.person.lastName(),
      firstName: overrides.firstName ?? faker.person.firstName(),
      email: overrides.email ?? faker.internet.email().toLowerCase(),
      // Valor fijo que NO es un hash bcrypt válido: alcanza para los tests que
      // no prueban el login. Para probar el login, pasar un hash real.
      passwordHash: overrides.passwordHash ?? 'hash-no-valido-solo-para-tests',
      active: overrides.active ?? true,
      lawyerId: overrides.lawyerId ?? null,
      roles: {
        create: roles.map((role) => ({ roleId: role.id })),
      },
    },
    include: { roles: true },
  });
}
