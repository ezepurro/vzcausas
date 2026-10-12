// This script runs outside Nest, so nothing has loaded `.env` on its
// behalf. Without this the connection fails with a SASL error that says
// nothing about the actual cause.
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
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
  { name: 'qualification:create', description: 'Registrar calificaciones legales.' },
  { name: 'qualification:read', description: 'Consultar calificaciones legales.' },
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
 *
 * `qualification:update` and `qualification:delete` are absent because
 * they do not exist yet: HU-49 and HU-50 have no endpoint.
 */
const STAFF = [
  'client:read',
  'client:create',
  'lawyer:read',
  'qualification:read',
  'qualification:create',
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

// ─── Development fixture: legal qualifications and a client ──────────────────

/**
 * Sample data, not the firm's: the definitive legal qualifications and their
 * prescription terms are loaded by the Administrator through the API.
 *
 * Users and cases are deliberately absent: the only account is the one
 * `DevSeedService` creates at startup (`Development Administrator`), and cases
 * are registered live through the app.
 */
const DEV_LEGAL_QUALIFICATIONS = [
  { name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 },
  { name: 'Homicidio simple — art. 79 CP', prescriptionMonths: 180 },
  { name: 'Estafa — art. 172 CP', prescriptionMonths: 72 },
] as const;

/**
 * A professional record with no account on purpose: the demo creates its user
 * profile through the app and links it. Registration numbers follow the
 * `<circuit>-<number>` shape of the `RegistrationNumber` value object, already
 * normalized because the `@shared/*` aliases do not resolve under ts-node.
 */
const DEV_LAWYERS = [{ fullName: 'Fernando Vázquez', registrationNumber: '1-28114' }] as const;

/** The DNI travels without dots (D-17) and is unique among active clients. */
const DEV_CLIENTS = [
  { lastName: 'GÓMEZ', firstName: 'Ariel Fernando', dni: '34812905', phone: '351 415-2288', email: 'afgomez@example.com' },
] as const;

/** Today's civil date in the firm's time zone, at midnight UTC, like a `date` column. */
function civilToday(): Date {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE ?? 'America/Argentina/Cordoba',
  }).format(new Date());
  return new Date(`${iso}T00:00:00.000Z`);
}

/**
 * Idempotent like the rest: qualifications and clients are looked up by the
 * rule of their partial unique index.
 */
async function seedDevData(prisma: PrismaClient): Promise<void> {
  for (const qualification of DEV_LEGAL_QUALIFICATIONS) {
    const existing = await prisma.legalQualification.findFirst({
      where: { name: { equals: qualification.name, mode: 'insensitive' }, active: true },
    });
    if (existing) {
      await prisma.legalQualification.update({
        where: { id: existing.id },
        data: { prescriptionMonths: qualification.prescriptionMonths },
      });
    } else {
      await prisma.legalQualification.create({ data: qualification });
    }
  }

  for (const lawyer of DEV_LAWYERS) {
    await prisma.lawyer.upsert({
      where: { registrationNumber: lawyer.registrationNumber },
      update: { fullName: lawyer.fullName, active: true },
      create: lawyer,
    });
  }

  const today = civilToday();
  for (const client of DEV_CLIENTS) {
    const existing = await prisma.client.findFirst({ where: { dni: client.dni, active: true } });
    if (!existing) {
      await prisma.client.create({ data: { ...client, clientSince: today } });
    }
  }

  console.log(
    `Development fixture: ${DEV_LEGAL_QUALIFICATIONS.length} legal qualifications, ` +
      `${DEV_LAWYERS.length} lawyer, ${DEV_CLIENTS.length} client.`,
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

    // Development only: sample data must never reach another environment.
    if (process.env.NODE_ENV === 'development') {
      await seedDevData(prisma);
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
