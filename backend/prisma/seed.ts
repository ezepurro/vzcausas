// This script runs outside Nest, so nothing has loaded `.env` on its
// behalf. Without this the connection fails with a SASL error that says
// nothing about the actual cause.
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
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
  // Writing only (HU45, HU17, HU46). Reading procedural states is open to
  // any authenticated user (contract §3.4), so it needs no permission.
  { name: 'procedural-state:create', description: 'Registrar estados procesales.' },
  { name: 'procedural-state:update', description: 'Modificar estados procesales.' },
  { name: 'procedural-state:delete', description: 'Dar de baja estados procesales.' },
] as const;

/**
 * Reading is open to the whole firm.
 *
 * The contract's per-resource matrix puts `/clients` and `/lawyers`
 * reads at "cualquier usuario autenticado", and RN11 says why: the
 * whole firm sees everything, the difference between profiles is what
 * they may **operate**, not what they may **see**. CA-9.3 restates it
 * for clients.
 */
const ANY_AUTHENTICATED = ['client:read', 'lawyer:read'];

/**
 * Permissions reserved for `SECRETARY`, and **withheld from
 * `ADMINISTRATOR`**.
 *
 * CA-8.9 is explicit: an Administrator or a Lawyer attempting to
 * register a client must be denied, because administering clients
 * belongs to the Secretary alone (contract §3.6, decision D-05).
 * Without this exclusion the rule below would hand Administrator
 * every permission in the catalogue and the criterion would fail
 * silently — the endpoint would answer 201 to the wrong role.
 */
const SECRETARY_ONLY = ['client:create'];

/**
 * The contract's permission matrix, in three lines.
 *
 * `ADMINISTRATOR` administers users and lawyers (§3.2, §3.3) and so
 * holds everything except what belongs to the Secretary. The other
 * two carry the open reads, which is what lets a Lawyer consult the
 * client and lawyer listings — before HU-9 this list was empty and
 * both endpoints answered 403 to them, against the matrix.
 */
const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  ADMINISTRATOR: PERMISSIONS.map((p) => p.name).filter(
    (name) => !SECRETARY_ONLY.includes(name),
  ),
  LAWYER: ANY_AUTHENTICATED,
  SECRETARY: [...ANY_AUTHENTICATED, ...SECRETARY_ONLY],
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

/**
 * Procedural states for development: the system "Iniciada" state plus
 * five sample states per jurisdiction. The definitive table is supplied
 * by the firm (RN4, RN5) and loaded through the API. `name` is unique
 * per jurisdiction among active rows (case-insensitive), so the same
 * name may repeat across jurisdictions. Contract rules:
 * `timeLimitDays = 0` ⇔ `dayType = NONE`, and the initial state
 * (`isInitial`) is non-terminal with no time limit. States have no
 * order (D-31).
 *
 * The `name` values stay in Spanish: they are legal terminology the
 * firm reads verbatim, not developer-facing strings.
 */
const INITIAL_STATE = {
  name: 'Iniciada',
  timeLimitDays: 0,
  dayType: 'NONE',
  terminal: false,
  isInitial: true,
} as const;

const PROCEDURAL_STATES = [
  // Criminal
  { jurisdiction: 'CRIMINAL', ...INITIAL_STATE },
  {
    jurisdiction: 'CRIMINAL',
    name: 'Designación de abogado defensor',
    timeLimitDays: 3,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'CRIMINAL',
    name: 'Declaración del imputado',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'CRIMINAL',
    name: 'Requerimiento de citación a juicio',
    timeLimitDays: 10,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'CRIMINAL',
    name: 'Oposición al requerimiento de elevación',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
  },
  { jurisdiction: 'CRIMINAL', name: 'Sentencia definitiva', timeLimitDays: 0, dayType: 'NONE', terminal: true },
  // Administrative
  { jurisdiction: 'ADMINISTRATIVE', ...INITIAL_STATE },
  {
    jurisdiction: 'ADMINISTRATIVE',
    name: 'Notificación de imputación en sumario',
    timeLimitDays: 10,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'ADMINISTRATIVE',
    name: 'Presentación de descargo',
    timeLimitDays: 10,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'ADMINISTRATIVE',
    name: 'Apertura a prueba',
    timeLimitDays: 20,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'ADMINISTRATIVE',
    name: 'Presentación de alegato',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
  },
  { jurisdiction: 'ADMINISTRATIVE', name: 'Archivada', timeLimitDays: 0, dayType: 'NONE', terminal: true },
  // Amparo (constitutional relief)
  { jurisdiction: 'AMPARO', ...INITIAL_STATE },
  {
    jurisdiction: 'AMPARO',
    name: 'Interposición de la acción',
    timeLimitDays: 0,
    dayType: 'NONE',
    terminal: false,
  },
  {
    jurisdiction: 'AMPARO',
    name: 'Pedido de informe',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'AMPARO',
    name: 'Contestación del informe',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
  },
  {
    jurisdiction: 'AMPARO',
    name: 'Recurso de apelación',
    timeLimitDays: 3,
    dayType: 'BUSINESS',
    terminal: false,
  },
  { jurisdiction: 'AMPARO', name: 'Sentencia firme', timeLimitDays: 0, dayType: 'NONE', terminal: true },
] as const;

/**
 * Development fixture. It lives here rather than in `DevSeedService`
 * because that service exists to guarantee *one* account that can log
 * in; this is bulk data to exercise listings and role-based access.
 *
 * Registration numbers follow the `<circuit>-<number>` shape validated
 * by the `RegistrationNumber` value object. The object itself is not
 * imported: the `@shared/*` and `@subsystems/*` aliases do not resolve
 * under `ts-node prisma/seed.ts`, so the literals must already be in
 * their normalized form.
 */
const DEV_LAWYERS = [
  { fullName: 'Fernando Vázquez', registrationNumber: '1-28114' },
  { fullName: 'Lucía Zárate', registrationNumber: '1-30455' },
  { fullName: 'Carla Pereyra', registrationNumber: '1-31002' },
  { fullName: 'Diego Molina', registrationNumber: '2-18447' },
  { fullName: 'Valeria Quiroga', registrationNumber: '2-20113' },
  { fullName: 'Martín Ludueña', registrationNumber: '1-29876' },
  { fullName: 'Sofía Bustos', registrationNumber: '1-33120' },
  { fullName: 'Javier Ceballos', registrationNumber: '3-10455' },
  { fullName: 'Noelia Ferreyra', registrationNumber: '2-21988' },
  { fullName: 'Gonzalo Aguirre', registrationNumber: '1-34567' },
] as const;

/**
 * Mapped one-to-one onto `DEV_LAWYERS`, the same way `DevSeedService`
 * links its `admin` account to a professional record.
 *
 * The partial unique index `users_lawyer_id_active_key` allows at most
 * one *active* account per lawyer, so every registration number appears
 * exactly once here and all ten end up taken. A further active account
 * in development needs a registration number of its own.
 *
 * Neither `admin` nor registration number `0-00000` appear on purpose:
 * those belong to `DevSeedService`, which runs after this script and
 * would overwrite them.
 *
 * Roles are spread so all three can be exercised — two partners holding
 * a double role, management as a plain administrator, two secretaries.
 * Usernames are restricted to `[a-z0-9._-]` by the `Username` value
 * object, hence `m.luduena` rather than the accented spelling.
 */
const DEV_USERS = [
  {
    username: 'f.vazquez',
    fullName: 'Fernando Vázquez',
    email: 'f.vazquez@vzcausas.local',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    registrationNumber: '1-28114',
  },
  {
    username: 'l.zarate',
    fullName: 'Lucía Zárate',
    email: 'l.zarate@vzcausas.local',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    registrationNumber: '1-30455',
  },
  {
    username: 'c.pereyra',
    fullName: 'Carla Pereyra',
    email: 'c.pereyra@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '1-31002',
  },
  {
    username: 'd.molina',
    fullName: 'Diego Molina',
    email: 'd.molina@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '2-18447',
  },
  {
    username: 'v.quiroga',
    fullName: 'Valeria Quiroga',
    email: 'v.quiroga@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '2-20113',
  },
  {
    username: 'm.luduena',
    fullName: 'Martín Ludueña',
    email: 'm.luduena@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '1-29876',
  },
  {
    username: 's.bustos',
    fullName: 'Sofía Bustos',
    email: 's.bustos@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '1-33120',
  },
  {
    username: 'j.ceballos',
    fullName: 'Javier Ceballos',
    email: 'j.ceballos@vzcausas.local',
    roles: ['ADMINISTRATOR'],
    registrationNumber: '3-10455',
  },
  {
    username: 'n.ferreyra',
    fullName: 'Noelia Ferreyra',
    email: 'n.ferreyra@vzcausas.local',
    roles: ['SECRETARY'],
    registrationNumber: '2-21988',
  },
  {
    username: 'g.aguirre',
    fullName: 'Gonzalo Aguirre',
    email: 'g.aguirre@vzcausas.local',
    roles: ['SECRETARY'],
    registrationNumber: '1-34567',
  },
] as const;

async function seedDevPeople(prisma: PrismaClient): Promise<void> {
  const password = process.env.DEV_SEED_PASSWORD ?? 'admin123';
  // One hash for all ten accounts: bcrypt at cost 12 takes around
  // 250 ms per call, so hashing each one separately would add two and a
  // half seconds to every boot and buy nothing — the password is shared
  // and is not a secret.
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_COST ?? 12));

  const lawyerIds = new Map<string, number>();
  for (const lawyer of DEV_LAWYERS) {
    const row = await prisma.lawyer.upsert({
      where: { registrationNumber: lawyer.registrationNumber },
      update: { fullName: lawyer.fullName, active: true },
      create: lawyer,
    });
    lawyerIds.set(lawyer.registrationNumber, row.id);
  }

  for (const user of DEV_USERS) {
    const lawyerId = lawyerIds.get(user.registrationNumber);
    // Without this, a typo in a registration number would come through
    // as `undefined`, which Prisma reads as "field omitted" and inserts
    // as NULL — leaving a silently unlinked account behind.
    if (lawyerId === undefined) {
      throw new Error(
        `User ${user.username} references registration number ${user.registrationNumber}, which is not in DEV_LAWYERS.`,
      );
    }

    const row = await prisma.user.upsert({
      where: { username: user.username },
      // The password is refreshed so that editing the variable takes
      // effect without wiping the volume.
      update: { passwordHash, fullName: user.fullName, email: user.email, lawyerId, active: true, deletedAt: null },
      create: { username: user.username, fullName: user.fullName, email: user.email, passwordHash, lawyerId },
    });

    const roles = await prisma.role.findMany({ where: { name: { in: [...user.roles] } } });
    // Replaced rather than merged, for the same reason as
    // `role_permissions`: the constants above are the source of truth.
    // Note this discards roles assigned through the API in development.
    await prisma.userRole.deleteMany({ where: { userId: row.id } });
    await prisma.userRole.createMany({
      data: roles.map((role) => ({ userId: row.id, roleId: role.id })),
    });
  }

  console.log(
    `Development fixture: ${DEV_LAWYERS.length} lawyers, ${DEV_USERS.length} users (password in DEV_SEED_PASSWORD).`,
  );
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

    for (const { jurisdiction: code, ...state } of PROCEDURAL_STATES) {
      const jurisdiction = await prisma.jurisdiction.findUniqueOrThrow({
        where: { name: code },
      });
      const data = { ...state, jurisdictionId: jurisdiction.jurisdictionId };

      // `name` is no longer a unique key, so there is nothing to upsert
      // on. Look the row up by the same rule the partial unique index
      // enforces (jurisdiction + case-insensitive name, active only) to
      // keep the seed idempotent.
      const existing = await prisma.proceduralState.findFirst({
        where: {
          jurisdictionId: jurisdiction.jurisdictionId,
          name: { equals: state.name, mode: 'insensitive' },
          isActive: true,
        },
      });

      if (existing) {
        await prisma.proceduralState.update({ where: { stateId: existing.stateId }, data });
      } else {
        await prisma.proceduralState.create({ data });
      }
    }

    // Development only: a database holding accounts with a known
    // password is precisely what must never exist anywhere else. The
    // gate is the entire security argument for this fixture.
    if (process.env.NODE_ENV === 'development') {
      await seedDevPeople(prisma);
    }

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
