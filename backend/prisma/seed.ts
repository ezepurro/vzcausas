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

/**
 * System "Prescripta" state of the criminal jurisdiction (contract V4
 * §3.4, D-53): terminal, no time limit, protected against update and
 * deletion. HU33 moves a case here, so it has to exist in every
 * environment, like "Iniciada". The CHECK and the partial unique index
 * of `sprint3_manual_constraints` require exactly this shape, and one
 * per jurisdiction.
 */
const PRESCRIBED_STATE = {
  name: 'Prescripta',
  timeLimitDays: 0,
  dayType: 'NONE',
  terminal: true,
  isPrescribed: true,
} as const;

const PROCEDURAL_STATES = [
  // Criminal
  { jurisdiction: 'CRIMINAL', ...INITIAL_STATE },
  { jurisdiction: 'CRIMINAL', ...PRESCRIBED_STATE },
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
  { lastName: 'Vázquez', firstName: 'Fernando', registrationNumber: '1-28114' },
  { lastName: 'Zárate', firstName: 'Lucía', registrationNumber: '1-30455' },
  { lastName: 'Pereyra', firstName: 'Carla', registrationNumber: '1-31002' },
  { lastName: 'Molina', firstName: 'Diego', registrationNumber: '2-18447' },
  { lastName: 'Quiroga', firstName: 'Valeria', registrationNumber: '2-20113' },
  { lastName: 'Ludueña', firstName: 'Martín', registrationNumber: '1-29876' },
  { lastName: 'Bustos', firstName: 'Sofía', registrationNumber: '1-33120' },
  { lastName: 'Ceballos', firstName: 'Javier', registrationNumber: '3-10455' },
  { lastName: 'Ferreyra', firstName: 'Noelia', registrationNumber: '2-21988' },
  { lastName: 'Aguirre', firstName: 'Gonzalo', registrationNumber: '1-34567' },
  // The lawyer behind the `abogado` demo account: responsible for the demo cases.
  { lastName: 'Prueba', firstName: 'Abogado', registrationNumber: '1-40001' },
] as const;

/**
 * Mapped one-to-one onto `DEV_LAWYERS`, the same way `DevSeedService`
 * links its `admin` account to a professional record.
 *
 * The partial unique index `users_lawyer_id_active_key` allows at most
 * one *active* account per lawyer, so every registration number appears
 * at most once here and all eleven end up taken. A further active account
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
 *
 * `abogado` and `secret` are short demo accounts with a password of their
 * own (`password`), for trying the app quickly: a lawyer in charge of the
 * demo cases below, and a secretary. A secretary-only account has no
 * professional record (D-25), so `registrationNumber` is left out.
 */
interface DevUser {
  username: string;
  lastName: string;
  firstName: string;
  email: string;
  roles: readonly string[];
  registrationNumber?: string;
  // Defaults to DEV_SEED_PASSWORD.
  password?: string;
}

const DEV_USERS: readonly DevUser[] = [
  {
    username: 'f.vazquez',
    lastName: 'Vázquez',
    firstName: 'Fernando',
    email: 'f.vazquez@vzcausas.local',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    registrationNumber: '1-28114',
  },
  {
    username: 'l.zarate',
    lastName: 'Zárate',
    firstName: 'Lucía',
    email: 'l.zarate@vzcausas.local',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    registrationNumber: '1-30455',
  },
  {
    username: 'c.pereyra',
    lastName: 'Pereyra',
    firstName: 'Carla',
    email: 'c.pereyra@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '1-31002',
  },
  {
    username: 'd.molina',
    lastName: 'Molina',
    firstName: 'Diego',
    email: 'd.molina@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '2-18447',
  },
  {
    username: 'v.quiroga',
    lastName: 'Quiroga',
    firstName: 'Valeria',
    email: 'v.quiroga@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '2-20113',
  },
  {
    username: 'm.luduena',
    lastName: 'Ludueña',
    firstName: 'Martín',
    email: 'm.luduena@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '1-29876',
  },
  {
    username: 's.bustos',
    lastName: 'Bustos',
    firstName: 'Sofía',
    email: 's.bustos@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '1-33120',
  },
  {
    username: 'j.ceballos',
    lastName: 'Ceballos',
    firstName: 'Javier',
    email: 'j.ceballos@vzcausas.local',
    roles: ['ADMINISTRATOR'],
    registrationNumber: '3-10455',
  },
  {
    username: 'n.ferreyra',
    lastName: 'Ferreyra',
    firstName: 'Noelia',
    email: 'n.ferreyra@vzcausas.local',
    roles: ['SECRETARY'],
    registrationNumber: '2-21988',
  },
  {
    username: 'g.aguirre',
    lastName: 'Aguirre',
    firstName: 'Gonzalo',
    email: 'g.aguirre@vzcausas.local',
    roles: ['SECRETARY'],
    registrationNumber: '1-34567',
  },
  {
    username: 'abogado',
    lastName: 'Prueba',
    firstName: 'Abogado',
    email: 'abogado@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '1-40001',
    password: 'abogado123',
  },
  {
    username: 'secret',
    lastName: 'Prueba',
    firstName: 'Secretaría',
    email: 'secret@vzcausas.local',
    roles: ['SECRETARY'],
    password: 'secret123',
  },
];

async function seedDevPeople(prisma: PrismaClient): Promise<void> {
  const defaultPassword = process.env.DEV_SEED_PASSWORD ?? 'admin123';
  const cost = Number(process.env.BCRYPT_COST ?? 12);
  // One hash per distinct password: bcrypt at cost 12 takes around 250 ms
  // per call, so hashing for each account would add seconds to every boot
  // and buy nothing — these passwords are shared and are not secrets.
  const hashes = new Map<string, string>();
  const hashOf = async (password: string): Promise<string> => {
    if (!hashes.has(password)) hashes.set(password, await bcrypt.hash(password, cost));
    return hashes.get(password)!;
  };

  const lawyerIds = new Map<string, number>();
  for (const lawyer of DEV_LAWYERS) {
    const row = await prisma.lawyer.upsert({
      where: { registrationNumber: lawyer.registrationNumber },
      update: { lastName: lawyer.lastName, firstName: lawyer.firstName, active: true },
      create: lawyer,
    });
    lawyerIds.set(lawyer.registrationNumber, row.id);
  }

  for (const user of DEV_USERS) {
    const passwordHash = await hashOf(user.password ?? defaultPassword);
    // `null` only when the account has no professional record on purpose.
    let lawyerId: number | null = null;
    if (user.registrationNumber !== undefined) {
      const found = lawyerIds.get(user.registrationNumber);
      // Without this, a typo in a registration number would come through
      // as `undefined`, which Prisma reads as "field omitted" and inserts
      // as NULL — leaving a silently unlinked account behind.
      if (found === undefined) {
        throw new Error(
          `User ${user.username} references registration number ${user.registrationNumber}, which is not in DEV_LAWYERS.`,
        );
      }
      lawyerId = found;
    }

    const row = await prisma.user.upsert({
      where: { username: user.username },
      // The password is refreshed so that editing the variable takes
      // effect without wiping the volume.
      update: { passwordHash, lastName: user.lastName, firstName: user.firstName, email: user.email, lawyerId, active: true, deletedAt: null },
      create: { username: user.username, lastName: user.lastName, firstName: user.firstName, email: user.email, passwordHash, lawyerId },
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
    `Development fixture: ${DEV_LAWYERS.length} lawyers, ${DEV_USERS.length} users ` +
      '(password in DEV_SEED_PASSWORD; `abogado` / `secret` have their own).',
  );
}

// ─── Development fixture: clients, legal qualifications and cases ────────────

/**
 * Sample data, not the firm's: the definitive legal qualifications and their
 * prescription terms are loaded by the Administrator through the API. They
 * only give the demo cases something to point at.
 */
const DEV_LEGAL_QUALIFICATIONS = [
  { name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 },
  { name: 'Homicidio simple — art. 79 CP', prescriptionMonths: 180 },
  { name: 'Estafa — art. 172 CP', prescriptionMonths: 72 },
] as const;

/**
 * The DNI travels without dots (D-17) and the document is unique per type among
 * active clients (D-108). Address and phone are required for a new client (D-109).
 */
const DEV_CLIENTS = [
  { lastName: 'GÓMEZ', firstName: 'Ariel Fernando', documentType: 'DNI', documentNumber: '34812905', address: 'Av. Rafael Núñez 4560, Córdoba', phone: '351 415-2288', email: 'afgomez@example.com' },
  { lastName: 'PEREYRA', firstName: 'Marcos D.', documentType: 'DNI', documentNumber: '29440117', address: 'Obispo Trejo 245, Córdoba', phone: '351 622-9014', email: null },
  { lastName: 'MOYANO', firstName: 'Daniela', documentType: 'DNI', documentNumber: '31256890', address: 'Bv. San Juan 870, Córdoba', phone: '351 744-1160', email: 'dmoyano@example.com' },
  { lastName: 'RUIZ', firstName: 'Julián', documentType: 'DNI', documentNumber: '38120456', address: 'Av. Colón 1320, Córdoba', phone: '351 530-1177', email: null },
  { lastName: 'LEDESMA', firstName: 'Verónica', documentType: 'DNI', documentNumber: '27654321', address: 'Duarte Quirós 512, Córdoba', phone: '351 415-8890', email: null },
] as const;

interface DevAct {
  state: string;
  // Calendar days before today.
  daysAgo: number;
}

interface DevCase {
  sacNumber: string;
  jurisdiction: 'CRIMINAL' | 'ADMINISTRATIVE' | 'AMPARO';
  proceduralRole: 'DEFENSA' | 'RECURRENTE' | 'ACTORA';
  caption: string;
  clientDocumentNumber: string;
  // Only ADMINISTRATIVE and AMPARO.
  counterparty?: string;
  subjectMatter?: string;
  // Only CRIMINAL: qualifications with the date of the offense.
  offenses?: { qualification: string; offenseDate: string }[];
  // Data of each jurisdiction (D-67). Left out, a datum takes the value the app gives it by default.
  clientDetained?: boolean;
  courtFeePaid?: boolean;
  injunctionGranted?: boolean;
  administrativeRemedyExhaustedOn?: string;
  // AMPARO: the harmful act (D-78), as days before today. Its term is only open while the case is in "Iniciada".
  harmfulAct?: { daysAgo: number; renewalDays?: number; termDays: number; termDayType: 'BUSINESS' | 'CONSECUTIVE' };
  // Acts, oldest first: the case ends up in the state of the last one. None: it stays in "Iniciada".
  acts: DevAct[];
}

/**
 * One case per jurisdiction, each with two procedural acts: the case leaves
 * "Iniciada" with the first and ends up in the state of the second. All three
 * are in charge of the `abogado` demo account, so that account can register
 * further acts on them. The `state` names are those of `PROCEDURAL_STATES`.
 */
const DEV_CASES: readonly DevCase[] = [
  {
    sacNumber: '90000001',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSA',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    clientDocumentNumber: '34812905',
    clientDetained: true,
    courtFeePaid: true,
    offenses: [
      { qualification: 'Robo calificado — art. 167 inc. 2 CP', offenseDate: '2021-02-27' },
      { qualification: 'Estafa — art. 172 CP', offenseDate: '2021-03-05' },
    ],
    acts: [
      { state: 'Designación de abogado defensor', daysAgo: 14 },
      { state: 'Declaración del imputado', daysAgo: 4 },
    ],
  },
  {
    sacNumber: '90000002',
    jurisdiction: 'ADMINISTRATIVE',
    proceduralRole: 'RECURRENTE',
    caption: 'PEREYRA, Marcos D. — Sumario administrativo',
    clientDocumentNumber: '29440117',
    counterparty: 'Policía de la Provincia',
    subjectMatter: 'Descargo frente a la imputación de falta grave y pedido de sobreseimiento.',
    administrativeRemedyExhaustedOn: '2026-08-10',
    acts: [
      { state: 'Notificación de imputación en sumario', daysAgo: 20 },
      { state: 'Presentación de descargo', daysAgo: 6 },
    ],
  },
  {
    sacNumber: '90000003',
    jurisdiction: 'AMPARO',
    proceduralRole: 'ACTORA',
    caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
    clientDocumentNumber: '31256890',
    counterparty: 'APROSS',
    subjectMatter: 'Que se ordene la cobertura integral del tratamiento de rehabilitación prescripto.',
    injunctionGranted: true,
    // The case already left "Iniciada", so its term to file the amparo no longer counts (D-78).
    harmfulAct: { daysAgo: 40, termDays: 15, termDayType: 'BUSINESS' },
    acts: [
      { state: 'Interposición de la acción', daysAgo: 12 },
      { state: 'Pedido de informe', daysAgo: 3 },
    ],
  },
  {
    // Still in "Iniciada": its harmful act renews every 30 days, so `harmfulActDeadline` shows in the detail.
    sacNumber: '90000004',
    jurisdiction: 'AMPARO',
    proceduralRole: 'ACTORA',
    caption: 'LEDESMA, Verónica c/ Municipalidad — Amparo ambiental',
    clientDocumentNumber: '27654321',
    counterparty: 'Municipalidad de Córdoba',
    subjectMatter: 'Que se ordene el cese del vertido de efluentes en el predio lindero.',
    injunctionGranted: false,
    harmfulAct: { daysAgo: 45, renewalDays: 30, termDays: 15, termDayType: 'BUSINESS' },
    acts: [],
  },
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Today's civil date in the firm's time zone, at midnight UTC, like a `date` column. */
function civilToday(): Date {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE ?? 'America/Argentina/Cordoba',
  }).format(new Date());
  return new Date(`${iso}T00:00:00.000Z`);
}

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * ONE_DAY_MS);

/**
 * Business days from Monday to Friday, counted from the day after. The same
 * provisional rule as the app's calculator (P-02: no holidays); the seed cannot
 * import it because the `@subsystems/*` aliases do not resolve under ts-node.
 */
function addBusinessDays(date: Date, days: number): Date {
  let current = date;
  let remaining = days;
  while (remaining > 0) {
    current = addDays(current, 1);
    if (current.getUTCDay() !== 0 && current.getUTCDay() !== 6) remaining--;
  }
  return current;
}

/** Adds months to a civil date; if the target month is shorter it falls on its last day. */
function addMonths(date: Date, months: number): Date {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target;
}

/**
 * Clients, legal qualifications and one case per jurisdiction, each with two
 * procedural acts. Idempotent like the rest: clients and qualifications are
 * looked up by the rule of their partial unique index, and a case is looked up
 * by its SAC number — if it exists it is left alone, so acts registered
 * through the app are never duplicated or overwritten.
 */
async function seedDevCases(prisma: PrismaClient): Promise<void> {
  const today = civilToday();

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

  for (const client of DEV_CLIENTS) {
    const existing = await prisma.client.findFirst({
      where: { documentType: client.documentType, documentNumber: client.documentNumber, active: true },
    });
    if (!existing) {
      await prisma.client.create({ data: { ...client, clientSince: today } });
    }
  }

  const lawyer = await prisma.lawyer.findUniqueOrThrow({ where: { registrationNumber: '1-40001' } });
  const lawyerUser = await prisma.user.findUniqueOrThrow({ where: { username: 'abogado' } });
  const secretary = await prisma.user.findUniqueOrThrow({ where: { username: 'secret' } });

  let created = 0;
  for (const devCase of DEV_CASES) {
    // findFirst y no findUnique: el SAC solo es único entre las causas
    // vigentes (D-97). Sin filtrar por `active`: el seed solo evita cargar
    // dos veces sus propios datos.
    if (await prisma.case.findFirst({ where: { sacNumber: devCase.sacNumber } })) continue;

    const jurisdiction = await prisma.jurisdiction.findUniqueOrThrow({ where: { name: devCase.jurisdiction } });
    const client = await prisma.client.findFirstOrThrow({
      where: { documentType: 'DNI', documentNumber: devCase.clientDocumentNumber, active: true },
    });
    const initialState = await prisma.proceduralState.findFirstOrThrow({
      where: { jurisdictionId: jurisdiction.jurisdictionId, isInitial: true, isActive: true },
    });
    const isAdministrative = devCase.jurisdiction === 'ADMINISTRATIVE';
    const isAmparo = devCase.jurisdiction === 'AMPARO';
    const isCriminal = devCase.jurisdiction === 'CRIMINAL';
    const harmfulAct = devCase.harmfulAct;
    // The case started in court a month before its first act (or before its harmful act, if it has none).
    const startDate = addDays(today, -(devCase.acts[0]?.daysAgo ?? harmfulAct?.daysAgo ?? 30) - 30);

    await prisma.$transaction(async (tx) => {
      const newCase = await tx.case.create({
        data: {
          sacNumber: devCase.sacNumber,
          caption: devCase.caption,
          jurisdictionId: jurisdiction.jurisdictionId,
          proceduralRole: devCase.proceduralRole,
          counterparty: devCase.counterparty ?? null,
          subjectMatter: devCase.subjectMatter ?? null,
          clientId: client.id,
          responsibleLawyerId: lawyer.id,
          startDate,
          // Data of each jurisdiction (D-67): `NULL` outside its own, as the app stores it.
          courtFeePaid: devCase.courtFeePaid ?? false,
          clientDetained: isCriminal ? (devCase.clientDetained ?? false) : null,
          injunctionGranted: isAmparo ? (devCase.injunctionGranted ?? false) : null,
          harmfulActDate: harmfulAct ? addDays(today, -harmfulAct.daysAgo) : null,
          harmfulActRenews: isAmparo ? harmfulAct?.renewalDays !== undefined : null,
          harmfulActRenewalDays: harmfulAct?.renewalDays ?? null,
          harmfulActTermDays: harmfulAct?.termDays ?? null,
          harmfulActTermDayType: harmfulAct?.termDayType ?? null,
          administrativeRemedyExhaustedOn: devCase.administrativeRemedyExhaustedOn
            ? new Date(`${devCase.administrativeRemedyExhaustedOn}T00:00:00.000Z`)
            : null,
          // A case is born in the initial state; the first act takes it out.
          currentStateId: initialState.stateId,
          // Registered by the secretary, as the app does.
          createdByUserId: secretary.id,
        },
      });

      for (const offense of devCase.offenses ?? []) {
        const qualification = await tx.legalQualification.findFirstOrThrow({
          where: { name: offense.qualification, active: true },
        });
        const offenseDate = new Date(`${offense.offenseDate}T00:00:00.000Z`);
        await tx.offense.create({
          data: {
            caseId: newCase.id,
            legalQualificationId: qualification.id,
            offenseDate,
            prescriptionDate: addMonths(offenseDate, qualification.prescriptionMonths),
          },
        });
      }

      let lastActId: number | null = null;
      let lastStateId = initialState.stateId;
      for (const act of devCase.acts) {
        const state = await tx.proceduralState.findFirstOrThrow({
          where: { jurisdictionId: jurisdiction.jurisdictionId, name: act.state, isActive: true },
        });
        const actDate = addDays(today, -act.daysAgo);
        // In the administrative jurisdiction the term runs from the notification (RN6).
        const notificationDate = isAdministrative ? addDays(actDate, 1) : null;
        const countsFrom = notificationDate ?? actDate;
        const opensTerm = state.timeLimitDays > 0;

        const saved = await tx.proceduralAct.create({
          data: {
            caseId: newCase.id,
            proceduralStateId: state.stateId,
            actDate,
            notificationDate,
            // The term of the table is copied into the act (CA-26.6).
            deadlineTimeLimitDays: state.timeLimitDays,
            deadlineDayType: state.dayType,
            deadlineCountsFrom: countsFrom,
            deadlineComputedDueDate: opensTerm ? addBusinessDays(countsFrom, state.timeLimitDays) : null,
            registeredByUserId: lawyerUser.id,
            registeredByLawyerId: lawyer.id,
          },
        });
        lastActId = saved.id;
        lastStateId = state.stateId;
      }

      // The case ends up in the state of its last act, which also gives its due date.
      await tx.case.update({
        where: { id: newCase.id },
        data: { currentStateId: lastStateId, currentProceduralActId: lastActId },
      });
    });
    created++;
  }

  console.log(
    `Development cases: ${DEV_CLIENTS.length} clients, ${DEV_LEGAL_QUALIFICATIONS.length} legal qualifications, ` +
      `${created} new cases of ${DEV_CASES.length} (the last one still in "Iniciada").`,
  );
}

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

    // After the catalog, which provides the ADMINISTRATOR role.
    await bootstrapAdministrator(prisma);

    // Development only: a database holding accounts with a known
    // password is precisely what must never exist anywhere else. The
    // gate is the entire security argument for this fixture.
    if (process.env.NODE_ENV === 'development') {
      await seedDevPeople(prisma);
      await seedDevCases(prisma);
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
