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
 * Reading is open to the whole firm.
 *
 * The contract's per-resource matrix puts `/clients` and `/lawyers`
 * reads at "cualquier usuario autenticado", and RN11 says why: the
 * whole firm sees everything, the difference between profiles is what
 * they may **operate**, not what they may **see**. CA-9.3 restates it
 * for clients.
 *
 * `/legal-qualifications` joins them by §3.5 and D-03, and for a
 * second reason of its own: the case registration form, which any
 * profile operates, offers the qualification selector (CA-47.1,
 * CA-47.10). A Lawyer who could not read the catalogue could not
 * register a criminal case at all.
 */
const ANY_AUTHENTICATED = ['client:read', 'lawyer:read', 'qualification:read'];

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
 *
 * `qualification:create` needs no entry of its own: the general rule
 * hands it to `ADMINISTRATOR` and withholds it from the other two,
 * which is exactly CA-48.9 — writing the legal parameters is the
 * Administrator's alone, because the whole firm's prescription terms
 * rest on them.
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
  // The lawyer behind the `abogado` demo account: responsible for the demo cases.
  { fullName: 'Abogado de Prueba', registrationNumber: '1-40001' },
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
  fullName: string;
  email: string;
  roles: readonly string[];
  registrationNumber?: string;
  // Defaults to DEV_SEED_PASSWORD.
  password?: string;
}

const DEV_USERS: readonly DevUser[] = [
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
  {
    username: 'abogado',
    fullName: 'Abogado de Prueba',
    email: 'abogado@vzcausas.local',
    roles: ['LAWYER'],
    registrationNumber: '1-40001',
    password: 'abogado123',
  },
  {
    username: 'secret',
    fullName: 'Secretaría de Prueba',
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
      update: { fullName: lawyer.fullName, active: true },
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

/** The DNI travels without dots (D-17) and is unique among active clients. */
const DEV_CLIENTS = [
  { lastName: 'GÓMEZ', firstName: 'Ariel Fernando', dni: '34812905', phone: '351 415-2288', email: 'afgomez@example.com' },
  { lastName: 'PEREYRA', firstName: 'Marcos D.', dni: '29440117', phone: '351 622-9014', email: null },
  { lastName: 'MOYANO', firstName: 'Daniela', dni: '31256890', phone: null, email: 'dmoyano@example.com' },
  { lastName: 'RUIZ', firstName: 'Julián', dni: '38120456', phone: '351 530-1177', email: null },
  { lastName: 'LEDESMA', firstName: 'Verónica', dni: '27654321', phone: null, email: null },
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
  clientDni: string;
  // Only ADMINISTRATIVE and AMPARO.
  counterparty?: string;
  subjectMatter?: string;
  // Only CRIMINAL: qualifications with the date of the offense.
  offenses?: { qualification: string; offenseDate: string }[];
  // Two acts per case, oldest first: the case ends up in the state of the last one.
  acts: [DevAct, DevAct];
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
    clientDni: '34812905',
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
    clientDni: '29440117',
    counterparty: 'Policía de la Provincia',
    subjectMatter: 'Descargo frente a la imputación de falta grave y pedido de sobreseimiento.',
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
    clientDni: '31256890',
    counterparty: 'APROSS',
    subjectMatter: 'Que se ordene la cobertura integral del tratamiento de rehabilitación prescripto.',
    acts: [
      { state: 'Interposición de la acción', daysAgo: 12 },
      { state: 'Pedido de informe', daysAgo: 3 },
    ],
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
    const existing = await prisma.client.findFirst({ where: { dni: client.dni, active: true } });
    if (!existing) {
      await prisma.client.create({ data: { ...client, clientSince: today } });
    }
  }

  const lawyer = await prisma.lawyer.findUniqueOrThrow({ where: { registrationNumber: '1-40001' } });
  const lawyerUser = await prisma.user.findUniqueOrThrow({ where: { username: 'abogado' } });
  const secretary = await prisma.user.findUniqueOrThrow({ where: { username: 'secret' } });

  let created = 0;
  for (const devCase of DEV_CASES) {
    if (await prisma.case.findUnique({ where: { sacNumber: devCase.sacNumber } })) continue;

    const jurisdiction = await prisma.jurisdiction.findUniqueOrThrow({ where: { name: devCase.jurisdiction } });
    const client = await prisma.client.findFirstOrThrow({ where: { dni: devCase.clientDni, active: true } });
    const initialState = await prisma.proceduralState.findFirstOrThrow({
      where: { jurisdictionId: jurisdiction.jurisdictionId, isInitial: true, isActive: true },
    });
    const isAdministrative = devCase.jurisdiction === 'ADMINISTRATIVE';
    const startDate = addDays(today, -devCase.acts[0].daysAgo - 30);

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

      let lastActId = 0;
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
      `${created} new cases of ${DEV_CASES.length} (each with 2 acts).`,
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
