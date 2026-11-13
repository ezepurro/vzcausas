// This script runs outside Nest, so nothing has loaded `.env` on its
// behalf. Without this the connection fails with a SASL error that says
// nothing about the actual cause.
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { SYSTEM_STATES, upsertProceduralState } from './procedural-states';

/*
 * Essential seed: only what the system needs to work, in every environment
 * (deploy, development, integration tests). Sample data for development and
 * presentations lives in `populate/populate.ts` (`npm run prisma:populate`).
 */

/**
 * Role catalog. Reference data, not user data: no endpoint creates
 * these at any scope, so seeding them is the only way they come to
 * exist. Without this, authentication succeeds and then fails resolving
 * the user's roles — a 500 on login that looks like a defect and is
 * really an unseeded database.
 *
 * No explicit `id`, deliberately: the columns are autoincrement, and
 * pinning ids in the `create` leaves the Postgres sequence at zero. The
 * first later insert that does not pin an id collides on a duplicate
 * key.
 */
const ROLES = [
  {
    name: 'ADMINISTRATOR',
    description: 'Administra usuarios, abogados y parametría del estudio.',
  },
  {
    name: 'LAWYER',
    description: 'Abogado del estudio. Opera sobre las causas a su cargo.',
  },
  {
    name: 'SECRETARY',
    description: 'Secretaría del estudio. Apoyo administrativo.',
  },
] as const;

/**
 * `namespace:action` format, validated by the `Permission` value
 * object. These are embedded in the access token's `permissions[]`
 * claim and read by `PermissionsGuard` on every request.
 *
 * Keep this list aligned with the permissions the endpoints actually
 * demand: a permission no role grants makes an endpoint unreachable for
 * everyone, and the failure shows up as a bare 403 that explains
 * nothing.
 */
const PERMISSIONS = [
  { name: 'user:create', description: 'Registrar usuarios.' },
  { name: 'user:read', description: 'Consultar usuarios.' },
  { name: 'user:update', description: 'Modificar usuarios.' },
  { name: 'user:delete', description: 'Dar de baja usuarios.' },
  { name: 'lawyer:create', description: 'Registrar abogados.' },
  { name: 'lawyer:read', description: 'Consultar abogados.' },
  { name: 'lawyer:update', description: 'Modificar abogados.' },
  { name: 'lawyer:delete', description: 'Dar de baja abogados.' },
  { name: 'client:create', description: 'Registrar clientes.' },
  { name: 'client:read', description: 'Consultar clientes.' },
  { name: 'client:update', description: 'Modificar clientes.' },
  { name: 'qualification:create', description: 'Registrar calificaciones legales.' },
  { name: 'qualification:read', description: 'Consultar calificaciones legales.' },
  { name: 'qualification:update', description: 'Modificar calificaciones legales.' },
  { name: 'qualification:delete', description: 'Dar de baja calificaciones legales.' },
  // Writing only (HU45, HU17, HU46). Reading procedural states is open to
  // any authenticated user (contract §3.4), so it needs no permission.
  { name: 'procedural-state:create', description: 'Registrar estados procesales.' },
  { name: 'procedural-state:update', description: 'Modificar estados procesales.' },
  { name: 'procedural-state:delete', description: 'Dar de baja estados procesales.' },
] as const;

/**
 * What the whole firm operates, Administrator included (matriz de
 * permisos §5.1, revisión del 2026-10-11).
 *
 * Reading is open for the reason RN11 gives: the whole firm sees
 * everything. Since that revision the three profiles also administer
 * clients, procedural states and legal qualifications. Before it,
 * registering clients was the Secretary's alone (D-05) and writing the
 * legal parameters the Administrator's alone (D-04); both decisions are
 * superseded.
 *
 * Listed one by one on purpose, rather than as "everything but the
 * Administrator's": a permission added to the catalogue tomorrow goes to
 * nobody but `ADMINISTRATOR` until someone decides otherwise. If this
 * list is wrong, it fails closed.
 */
const STAFF = [
  'client:read',
  'client:create',
  // HU10: the three profiles modify clients (CA-10.6).
  'client:update',
  'lawyer:read',
  'qualification:read',
  'qualification:create',
  // HU49 and HU50: the three profiles modify and give up legal
  // qualifications (matriz §5.1, D-39).
  'qualification:update',
  'qualification:delete',
  'procedural-state:create',
  'procedural-state:update',
  'procedural-state:delete',
];

/**
 * The permission matrix, in three lines.
 *
 * `ADMINISTRATOR` holds the whole catalogue: on top of what everyone
 * operates, it alone administers users and registers, modifies and
 * deactivates lawyers (§5.1). The other two operate the same set.
 *
 * Registering procedural acts is not here: it depends on being the
 * case's responsible lawyer, not on a role, and the use case checks it.
 */
const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  ADMINISTRATOR: PERMISSIONS.map((p) => p.name),
  LAWYER: STAFF,
  SECRETARY: STAFF,
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Check backend/.env (or the container environment).');
}

/**
 * Jurisdictions from the contract's `Jurisdiction` enum (§2). `name`
 * stores the code, which is what `JurisdictionMapper` reads.
 */
const JURISDICTIONS = [
  { name: 'CRIMINAL', dayTypeDefault: 'BUSINESS' },
  { name: 'ADMINISTRATIVE', dayTypeDefault: 'BUSINESS' },
  { name: 'AMPARO', dayTypeDefault: 'BUSINESS' },
] as const;

// ─── Bootstrap: the first administrator outside development ──────────────────

/**
 * Environment variables describing the first administrator, keyed by
 * the field each one fills (D-77).
 */
const BOOTSTRAP_ADMIN_VARS = {
  username: 'BOOTSTRAP_ADMIN_USERNAME',
  password: 'BOOTSTRAP_ADMIN_PASSWORD',
  email: 'BOOTSTRAP_ADMIN_EMAIL',
  lastName: 'BOOTSTRAP_ADMIN_LAST_NAME',
  firstName: 'BOOTSTRAP_ADMIN_FIRST_NAME',
  registrationNumber: 'BOOTSTRAP_ADMIN_REGISTRATION_NUMBER',
} as const;

/*
 * Copies of the domain rules, because this script cannot import the
 * domain: it resolves `@shared/*` aliases that ts-node does not. Keep
 * them in step with their source:
 *   - USERNAME_REGEX: username.vo.ts:3 (D-17, trimmed and lowercased first)
 *   - EMAIL_REGEX: email.vo.ts:3 (trimmed and lowercased first)
 *   - password policy: user.entity.ts `validatePasswordRules` (D-24)
 */
const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/;
const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const PASSWORD_DIGIT_REGEX = /\d/;

/**
 * Creates the first administrator from `BOOTSTRAP_ADMIN_*` (D-77).
 *
 * It exists because outside development nothing else can: the
 * development accounts are gated by `NODE_ENV` (D-63), and `POST /users`
 * needs an administrator to call it. Once this one exists, every other
 * account goes through the API.
 *
 * Acts only when all six variables are set and no active administrator
 * exists, so it runs once even if the variables stay behind. A partial
 * set, or a value the domain would reject, fails the seed — and with it
 * the deploy — instead of booting an application nobody can log into.
 *
 * Also writes the professional record (`lawyers`), which D-25 requires
 * of an administrator: the same cross-subsystem exception as D-75,
 * confined to bootstrap.
 */
async function bootstrapAdministrator(prisma: PrismaClient): Promise<void> {
  const entries = Object.entries(BOOTSTRAP_ADMIN_VARS).map(
    ([field, name]) => [field, process.env[name]?.trim() ?? ''] as const,
  );
  const missing = entries
    .filter(([, value]) => value === '')
    .map(([field]) => BOOTSTRAP_ADMIN_VARS[field as keyof typeof BOOTSTRAP_ADMIN_VARS]);

  if (missing.length === entries.length) {
    console.log('Administrator bootstrap: BOOTSTRAP_ADMIN_* not set, skipped.');
    return;
  }
  if (missing.length > 0) {
    throw new Error(
      `Administrator bootstrap: set all BOOTSTRAP_ADMIN_* variables or none. Missing: ${missing.join(', ')}.`,
    );
  }

  const values = Object.fromEntries(entries) as Record<keyof typeof BOOTSTRAP_ADMIN_VARS, string>;

  const activeAdministrators = await prisma.user.count({
    where: {
      active: true,
      deletedAt: null,
      roles: { some: { role: { name: 'ADMINISTRATOR' } } },
    },
  });
  if (activeAdministrators > 0) {
    console.warn(
      'Administrator bootstrap: an active administrator already exists, skipped. ' +
        'Remove the BOOTSTRAP_ADMIN_* variables from the environment.',
    );
    return;
  }

  const username = values.username.toLowerCase();
  const email = values.email.toLowerCase();
  // The password is the one value that is not trimmed: the domain
  // validates it as typed.
  const password = process.env[BOOTSTRAP_ADMIN_VARS.password]!;

  const errors: string[] = [];
  if (!USERNAME_REGEX.test(username)) {
    errors.push(`${BOOTSTRAP_ADMIN_VARS.username} must be 3–30 characters of [a-z0-9._-].`);
  }
  if (!EMAIL_REGEX.test(email)) {
    errors.push(`${BOOTSTRAP_ADMIN_VARS.email} is not a valid email address.`);
  }
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    !PASSWORD_DIGIT_REGEX.test(password) ||
    Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES
  ) {
    errors.push(
      `${BOOTSTRAP_ADMIN_VARS.password} must be at least ${MIN_PASSWORD_LENGTH} characters, ` +
        `contain a digit and not exceed ${MAX_PASSWORD_BYTES} bytes.`,
    );
  }
  if (errors.length > 0) {
    throw new Error(`Administrator bootstrap: ${errors.join(' ')}`);
  }

  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_COST ?? 12));
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMINISTRATOR' } });

  await prisma.$transaction(async (tx) => {
    // An existing record is linked as it is, never edited or reactivated:
    // a deactivated lawyer coming back is a decision for the API, not for
    // a deploy.
    const existing = await tx.lawyer.findUnique({
      where: { registrationNumber: values.registrationNumber },
    });
    if (existing && !existing.active) {
      throw new Error(
        `Administrator bootstrap: the lawyer with registration number ${values.registrationNumber} is deactivated.`,
      );
    }
    const lawyer =
      existing ??
      (await tx.lawyer.create({
        data: {
          lastName: values.lastName,
          firstName: values.firstName,
          registrationNumber: values.registrationNumber,
        },
      }));

    const user = await tx.user.create({
      data: {
        username,
        lastName: values.lastName,
        firstName: values.firstName,
        email,
        passwordHash,
        lawyerId: lawyer.id,
      },
    });
    await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
  });

  console.log(`Administrator bootstrap: created "${username}" with the ADMINISTRATOR role.`);
}

/**
 * Idempotent by construction: every write is an upsert on a unique
 * column, so running this against an already-seeded database does
 * nothing rather than failing on a duplicate key. That matters because
 * it runs on every deploy, not only against a fresh database.
 */
async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const role of ROLES) {
      await prisma.role.upsert({
        where: { name: role.name },
        // `isSystem` marks the roles the application depends on by
        // name, so that nothing offers to delete them later on.
        update: { description: role.description, isSystem: true },
        create: {
          name: role.name,
          description: role.description,
          isSystem: true,
        },
      });
    }

    for (const permission of PERMISSIONS) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: { description: permission.description },
        create: {
          name: permission.name,
          description: permission.description,
        },
      });
    }

    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await prisma.role.findUniqueOrThrow({
        where: { name: roleName },
      });

      const permissions = await prisma.permission.findMany({
        where: { name: { in: [...permissionNames] } },
      });

      // Replaced, not merged: the constants above are the source of
      // truth, so a permission removed from there has to disappear from
      // the database. Merging would keep a revoked permission alive
      // forever, because nothing would ever delete the row.
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      });
    }

    for (const jurisdiction of JURISDICTIONS) {
      await prisma.jurisdiction.upsert({
        where: { name: jurisdiction.name },
        update: { dayTypeDefault: jurisdiction.dayTypeDefault },
        create: jurisdiction,
      });
    }

    for (const state of SYSTEM_STATES) {
      await upsertProceduralState(prisma, state);
    }

    // After the catalog, which provides the ADMINISTRATOR role.
    await bootstrapAdministrator(prisma);

    const roleCount = await prisma.role.count();
    const permissionCount = await prisma.permission.count();
    const jurisdictionCount = await prisma.jurisdiction.count();
    const stateCount = await prisma.proceduralState.count();
    console.log(
      `Seed complete: ${roleCount} roles, ${permissionCount} permissions, ` +
        `${jurisdictionCount} jurisdictions, ${stateCount} procedural states.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
