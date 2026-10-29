// This script runs outside Nest, so nothing has loaded `.env` on its
// behalf. Without this the connection fails with a SASL error that says
// nothing about the actual cause.
import 'dotenv/config';
import { PrismaClient, type ProceduralState } from '../src/generated/prisma/client';
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
 * Every name, DNI and number below is made up: the fixture is shown to the
 * firm, so it must not contain anyone from the firm. Emails use the `.local`
 * domain so that nothing the app sends from a demo can reach a real mailbox.
 *
 * Registration numbers follow the `<circuit>-<number>` shape validated
 * by the `RegistrationNumber` value object. The object itself is not
 * imported: the `@shared/*` and `@subsystems/*` aliases do not resolve
 * under `ts-node prisma/seed.ts`, so the literals must already be in
 * their normalized form.
 */
const DEV_LAWYERS = [
  { lastName: 'Sosa', firstName: 'Gabriela', registrationNumber: '1-27340' },
  { lastName: 'Bianchi', firstName: 'Ricardo', registrationNumber: '1-25981' },
  { lastName: 'Arias', firstName: 'Florencia', registrationNumber: '1-32214' },
  { lastName: 'Herrera', firstName: 'Tomás', registrationNumber: '2-19873' },
  { lastName: 'Medina', firstName: 'Paula', registrationNumber: '1-35102' },
  { lastName: 'Rinaldi', firstName: 'Esteban', registrationNumber: '3-11208' },
  { lastName: 'Funes', firstName: 'Andrea', registrationNumber: '1-30876' },
] as const;

/**
 * Mapped one-to-one onto `DEV_LAWYERS`, the same way `DevSeedService`
 * links its `admin` account to a professional record.
 *
 * The partial unique index `users_lawyer_id_active_key` allows at most
 * one *active* account per lawyer, so every registration number appears
 * at most once here. A further active account in development needs a
 * registration number of its own.
 *
 * Neither `admin` nor registration number `0-00000` appear on purpose:
 * those belong to `DevSeedService`, which runs after this script and
 * would overwrite them.
 *
 * Roles are spread so all three can be exercised — two partners holding
 * a double role, management as a plain administrator, two secretaries.
 * A secretary-only account has no professional record (D-25), so
 * `registrationNumber` is left out. All of them share DEV_SEED_PASSWORD.
 */
interface DevUser {
  username: string;
  lastName: string;
  firstName: string;
  email: string;
  roles: readonly string[];
  registrationNumber?: string;
}

const DEV_USERS: readonly DevUser[] = [
  {
    username: 'g.sosa',
    lastName: 'Sosa',
    firstName: 'Gabriela',
    email: 'g.sosa@estudio.local',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    registrationNumber: '1-27340',
  },
  {
    username: 'r.bianchi',
    lastName: 'Bianchi',
    firstName: 'Ricardo',
    email: 'r.bianchi@estudio.local',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    registrationNumber: '1-25981',
  },
  {
    username: 'f.arias',
    lastName: 'Arias',
    firstName: 'Florencia',
    email: 'f.arias@estudio.local',
    roles: ['LAWYER'],
    registrationNumber: '1-32214',
  },
  {
    username: 't.herrera',
    lastName: 'Herrera',
    firstName: 'Tomás',
    email: 't.herrera@estudio.local',
    roles: ['LAWYER'],
    registrationNumber: '2-19873',
  },
  {
    username: 'p.medina',
    lastName: 'Medina',
    firstName: 'Paula',
    email: 'p.medina@estudio.local',
    roles: ['LAWYER'],
    registrationNumber: '1-35102',
  },
  {
    username: 'e.rinaldi',
    lastName: 'Rinaldi',
    firstName: 'Esteban',
    email: 'e.rinaldi@estudio.local',
    roles: ['LAWYER'],
    registrationNumber: '3-11208',
  },
  {
    username: 'a.funes',
    lastName: 'Funes',
    firstName: 'Andrea',
    email: 'a.funes@estudio.local',
    roles: ['ADMINISTRATOR'],
    registrationNumber: '1-30876',
  },
  {
    username: 'm.godoy',
    lastName: 'Godoy',
    firstName: 'Mónica',
    email: 'm.godoy@estudio.local',
    roles: ['SECRETARY'],
  },
  {
    username: 'j.paz',
    lastName: 'Paz',
    firstName: 'Joaquín',
    email: 'j.paz@estudio.local',
    roles: ['SECRETARY'],
  },
];

async function seedDevPeople(prisma: PrismaClient): Promise<void> {
  const password = process.env.DEV_SEED_PASSWORD ?? 'admin123';
  // One hash for every account: bcrypt at cost 12 takes around 250 ms per
  // call, and the password is shared and not a secret.
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_COST ?? 12));

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
    `Development fixture: ${DEV_LAWYERS.length} lawyers, ${DEV_USERS.length} users (password in DEV_SEED_PASSWORD).`,
  );
}

// ─── Development fixture: clients, legal qualifications and cases ────────────

/**
 * Sample data, not the firm's: the definitive legal qualifications and their
 * prescription terms are loaded by the Administrator through the API. The
 * terms follow art. 62 CP — the maximum of the penalty, between two and twelve
 * years.
 */
const DEV_LEGAL_QUALIFICATIONS = [
  { name: 'Hurto simple — art. 162 CP', prescriptionMonths: 24 },
  { name: 'Robo simple — art. 164 CP', prescriptionMonths: 72 },
  { name: 'Robo calificado por el uso de arma — art. 166 inc. 2 CP', prescriptionMonths: 144 },
  { name: 'Estafa — art. 172 CP', prescriptionMonths: 72 },
  { name: 'Lesiones leves — art. 89 CP', prescriptionMonths: 24 },
  { name: 'Lesiones graves — art. 90 CP', prescriptionMonths: 72 },
  { name: 'Homicidio culposo — art. 84 CP', prescriptionMonths: 60 },
  { name: 'Amenazas — art. 149 bis CP', prescriptionMonths: 24 },
  { name: 'Encubrimiento — art. 277 CP', prescriptionMonths: 36 },
] as const;

/** The DNI travels without dots (D-17) and is unique among active clients. */
const DEV_CLIENTS = [
  { lastName: 'CASTRO', firstName: 'Emiliano José', dni: '35447812', phone: '351 415-2288', email: 'emicastro@example.com' },
  { lastName: 'ROMERO', firstName: 'Natalia Belén', dni: '33019455', phone: '351 622-9014', email: 'nbromero@example.com' },
  { lastName: 'OLMOS', firstName: 'Héctor Raúl', dni: '22871360', phone: '351 530-1177', email: null },
  { lastName: 'VERA', firstName: 'Camila', dni: '40112738', phone: '351 687-4410', email: 'camivera@example.com' },
  { lastName: 'SALAS', firstName: 'Rodrigo Martín', dni: '30566921', phone: '3543 44-1902', email: null },
  { lastName: 'PAREDES', firstName: 'Silvina Andrea', dni: '28934107', phone: '351 290-6635', email: 'sparedes@example.com' },
  { lastName: 'NAVARRO', firstName: 'Facundo', dni: '39280554', phone: '351 744-0021', email: null },
  { lastName: 'ACOSTA', firstName: 'Miriam del Valle', dni: '25617843', phone: null, email: 'miriamacosta@example.com' },
  { lastName: 'BRIZUELA', firstName: 'Leandro Ezequiel', dni: '36702219', phone: '351 318-5567', email: null },
  { lastName: 'CABRERA', firstName: 'Ana María', dni: '20455306', phone: '351 423-8890', email: 'anacabrera@example.com' },
  { lastName: 'TOLEDO', firstName: 'Gustavo Adrián', dni: '31890467', phone: '3525 42-7713', email: null },
  { lastName: 'GAITÁN', firstName: 'Rocío Soledad', dni: '37508132', phone: '351 566-3049', email: 'rociogaitan@example.com' },
  { lastName: 'MANSILLA', firstName: 'Ramón Alberto', dni: '18923774', phone: '351 471-2286', email: null },
  { lastName: 'OVIEDO', firstName: 'Agustina', dni: '42011596', phone: '351 239-7754', email: 'aguoviedo@example.com' },
  { lastName: 'FIGUEROA', firstName: 'Walter Hugo', dni: '26770485', phone: null, email: null },
  { lastName: 'QUINTEROS', firstName: 'Lorena Beatriz', dni: '34129870', phone: '351 655-1308', email: 'lquinteros@example.com' },
] as const;

/**
 * Each act gives its date one of two ways. `daysAgo` fixes it in calendar
 * days before today. `dueInBusinessDays` fixes instead where its term ends,
 * counted from today — negative overdue, `0` due today — and works the date
 * of the act back from it, so the deadline lands in the same place whatever
 * day the seed runs.
 */
type DevAct = { state: string } & ({ daysAgo: number } | { dueInBusinessDays: number });

interface DevCase {
  sacNumber: string;
  jurisdiction: 'CRIMINAL' | 'ADMINISTRATIVE' | 'AMPARO';
  proceduralRole: 'DEFENSA' | 'QUERELLANTE_PARTICULAR' | 'RECURRENTE' | 'ACTORA';
  caption: string;
  court: string;
  clientDni: string;
  // Registration number of the responsible lawyer, who registers the acts.
  lawyer: string;
  // Only ADMINISTRATIVE and AMPARO.
  counterparty?: string;
  subjectMatter?: string;
  // Only CRIMINAL: qualifications with the date of the offense.
  offenses?: { qualification: string; offenseDate: string }[];
  // Only CRIMINAL: they restart the prescription term (RN8).
  interruptiveActs?: { name: string; daysAgo: number }[];
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
 * Cases spread over the three jurisdictions and the six lawyers, so the
 * dashboards have something in every column: overdue terms, terms due today
 * and in the coming days, finished cases, cases still in "Iniciada" and a
 * criminal case close to prescribing. The `state` names are those of
 * `PROCEDURAL_STATES`.
 */
const DEV_CASES: readonly DevCase[] = [
  // ── Criminal ──
  {
    sacNumber: '11204587',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSA',
    caption: 'CASTRO, Emiliano José p.s.a. Robo calificado por el uso de arma',
    court: 'Juzgado de Control N° 3 — Córdoba',
    clientDni: '35447812',
    lawyer: '1-27340',
    clientDetained: true,
    courtFeePaid: true,
    offenses: [{ qualification: 'Robo calificado por el uso de arma — art. 166 inc. 2 CP', offenseDate: '2026-03-14' }],
    acts: [
      { state: 'Designación de abogado defensor', daysAgo: 48 },
      { state: 'Declaración del imputado', daysAgo: 33 },
      { state: 'Requerimiento de citación a juicio', dueInBusinessDays: -2 },
    ],
  },
  {
    sacNumber: '10987342',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSA',
    caption: 'OLMOS, Héctor Raúl p.s.a. Estafa',
    court: 'Fiscalía de Instrucción del Distrito 2, Turno 4 — Córdoba',
    clientDni: '22871360',
    lawyer: '1-25981',
    courtFeePaid: true,
    offenses: [{ qualification: 'Estafa — art. 172 CP', offenseDate: '2025-11-03' }],
    acts: [
      { state: 'Designación de abogado defensor', daysAgo: 21 },
      { state: 'Declaración del imputado', dueInBusinessDays: 0 },
    ],
  },
  {
    sacNumber: '12045893',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSA',
    caption: 'NAVARRO, Facundo p.s.a. Lesiones graves',
    court: 'Fiscalía de Instrucción del Distrito 1, Turno 2 — Córdoba',
    clientDni: '39280554',
    lawyer: '1-32214',
    offenses: [{ qualification: 'Lesiones graves — art. 90 CP', offenseDate: '2026-08-22' }],
    acts: [{ state: 'Designación de abogado defensor', dueInBusinessDays: 2 }],
  },
  {
    sacNumber: '10512276',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSA',
    caption: 'BRIZUELA, Leandro Ezequiel p.s.a. Robo simple y Encubrimiento',
    court: 'Juzgado de Control N° 7 — Córdoba',
    clientDni: '36702219',
    lawyer: '2-19873',
    clientDetained: false,
    courtFeePaid: true,
    offenses: [
      { qualification: 'Robo simple — art. 164 CP', offenseDate: '2024-06-09' },
      { qualification: 'Encubrimiento — art. 277 CP', offenseDate: '2024-06-09' },
    ],
    interruptiveActs: [{ name: 'Citación a indagatoria', daysAgo: 70 }],
    acts: [
      { state: 'Designación de abogado defensor', daysAgo: 75 },
      { state: 'Declaración del imputado', daysAgo: 62 },
      { state: 'Requerimiento de citación a juicio', daysAgo: 30 },
      { state: 'Oposición al requerimiento de elevación', dueInBusinessDays: 4 },
    ],
  },
  {
    sacNumber: '09873410',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSA',
    caption: 'TOLEDO, Gustavo Adrián p.s.a. Homicidio culposo',
    court: 'Cámara en lo Criminal y Correccional de 5ª Nominación — Córdoba',
    clientDni: '31890467',
    lawyer: '1-27340',
    courtFeePaid: true,
    offenses: [{ qualification: 'Homicidio culposo — art. 84 CP', offenseDate: '2023-09-17' }],
    interruptiveActs: [{ name: 'Requerimiento de citación a juicio', daysAgo: 210 }],
    acts: [
      { state: 'Designación de abogado defensor', daysAgo: 400 },
      { state: 'Declaración del imputado', daysAgo: 385 },
      { state: 'Requerimiento de citación a juicio', daysAgo: 210 },
      { state: 'Sentencia definitiva', daysAgo: 15 },
    ],
  },
  {
    // No interruptive act and close to two years since the facts: shows the prescription alert (70 %).
    sacNumber: '10334658',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSA',
    caption: 'MANSILLA, Ramón Alberto p.s.a. Amenazas',
    court: 'Juzgado Correccional de 2ª Nominación — Córdoba',
    clientDni: '18923774',
    lawyer: '3-11208',
    offenses: [{ qualification: 'Amenazas — art. 149 bis CP', offenseDate: '2025-02-15' }],
    acts: [{ state: 'Designación de abogado defensor', dueInBusinessDays: -6 }],
  },
  {
    sacNumber: '12198734',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSA',
    caption: 'FIGUEROA, Walter Hugo p.s.a. Hurto simple',
    court: 'Fiscalía de Instrucción del Distrito 3, Turno 1 — Córdoba',
    clientDni: '26770485',
    lawyer: '1-35102',
    offenses: [{ qualification: 'Hurto simple — art. 162 CP', offenseDate: '2026-07-02' }],
    acts: [],
  },
  {
    sacNumber: '11650921',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'QUERELLANTE_PARTICULAR',
    caption: 'SOTO, Daniel Alejandro p.s.a. Lesiones leves',
    court: 'Juzgado Correccional de 1ª Nominación — Córdoba',
    clientDni: '20455306',
    lawyer: '1-25981',
    courtFeePaid: true,
    offenses: [{ qualification: 'Lesiones leves — art. 89 CP', offenseDate: '2026-01-25' }],
    acts: [
      { state: 'Declaración del imputado', daysAgo: 24 },
      { state: 'Requerimiento de citación a juicio', dueInBusinessDays: 6 },
    ],
  },
  // ── Administrative ──
  {
    sacNumber: '11873045',
    jurisdiction: 'ADMINISTRATIVE',
    proceduralRole: 'RECURRENTE',
    caption: 'ROMERO, Natalia Belén — Sumario administrativo N° 1452/26',
    court: 'Tribunal de Conducta Policial y Penitenciario',
    clientDni: '33019455',
    lawyer: '1-32214',
    counterparty: 'Policía de la Provincia de Córdoba',
    subjectMatter: 'Descargo frente a la imputación de falta grave por abandono de servicio y pedido de sobreseimiento.',
    administrativeRemedyExhaustedOn: '2026-08-10',
    acts: [
      { state: 'Notificación de imputación en sumario', daysAgo: 30 },
      { state: 'Presentación de descargo', dueInBusinessDays: 1 },
    ],
  },
  {
    sacNumber: '12230568',
    jurisdiction: 'ADMINISTRATIVE',
    proceduralRole: 'RECURRENTE',
    caption: 'SALAS, Rodrigo Martín — Sumario administrativo N° 873/26',
    court: 'Tribunal de Conducta Policial y Penitenciario',
    clientDni: '30566921',
    lawyer: '2-19873',
    counterparty: 'Servicio Penitenciario de Córdoba',
    subjectMatter: 'Defensa en el sumario por presunto incumplimiento de los deberes del cargo.',
    acts: [{ state: 'Notificación de imputación en sumario', dueInBusinessDays: -3 }],
  },
  {
    sacNumber: '11402397',
    jurisdiction: 'ADMINISTRATIVE',
    proceduralRole: 'RECURRENTE',
    caption: 'PAREDES, Silvina Andrea — Sumario administrativo N° 2210/25',
    court: 'Ministerio de Educación — Dirección de Sumarios',
    clientDni: '28934107',
    lawyer: '1-35102',
    counterparty: 'Ministerio de Educación de la Provincia de Córdoba',
    subjectMatter: 'Impugnación de la cesantía dispuesta y ofrecimiento de prueba testimonial y documental.',
    courtFeePaid: true,
    acts: [
      { state: 'Notificación de imputación en sumario', daysAgo: 70 },
      { state: 'Presentación de descargo', daysAgo: 50 },
      { state: 'Apertura a prueba', dueInBusinessDays: 8 },
    ],
  },
  {
    sacNumber: '10765183',
    jurisdiction: 'ADMINISTRATIVE',
    proceduralRole: 'RECURRENTE',
    caption: 'ACOSTA, Miriam del Valle — Sumario administrativo N° 455/25',
    court: 'Ministerio de Salud — Dirección de Sumarios',
    clientDni: '25617843',
    lawyer: '1-27340',
    counterparty: 'Ministerio de Salud de la Provincia de Córdoba',
    subjectMatter: 'Defensa en el sumario por presuntas irregularidades en el registro de asistencia.',
    acts: [
      { state: 'Notificación de imputación en sumario', daysAgo: 160 },
      { state: 'Presentación de descargo', daysAgo: 140 },
      { state: 'Apertura a prueba', daysAgo: 110 },
      { state: 'Presentación de alegato', daysAgo: 60 },
      { state: 'Archivada', daysAgo: 10 },
    ],
  },
  {
    sacNumber: '12310476',
    jurisdiction: 'ADMINISTRATIVE',
    proceduralRole: 'RECURRENTE',
    caption: 'GAITÁN, Rocío Soledad — Sumario administrativo N° 1987/26',
    court: 'Tribunal de Conducta Policial y Penitenciario',
    clientDni: '37508132',
    lawyer: '3-11208',
    counterparty: 'Policía de la Provincia de Córdoba',
    subjectMatter: 'Descargo frente a la imputación de falta leve y pedido de archivo de las actuaciones.',
    acts: [{ state: 'Notificación de imputación en sumario', dueInBusinessDays: 0 }],
  },
  // ── Amparo ──
  {
    sacNumber: '12087431',
    jurisdiction: 'AMPARO',
    proceduralRole: 'ACTORA',
    caption: 'VERA, Camila c/ APROSS — Amparo (Ley 4915)',
    court: 'Cámara Contencioso Administrativa de 2ª Nominación — Córdoba',
    clientDni: '40112738',
    lawyer: '1-25981',
    counterparty: 'APROSS',
    subjectMatter: 'Que se ordene la cobertura integral del tratamiento de rehabilitación prescripto.',
    injunctionGranted: true,
    courtFeePaid: true,
    // The case already left "Iniciada", so its term to file the amparo no longer counts (D-78).
    harmfulAct: { daysAgo: 50, termDays: 15, termDayType: 'BUSINESS' },
    acts: [
      { state: 'Interposición de la acción', daysAgo: 30 },
      { state: 'Pedido de informe', dueInBusinessDays: 3 },
    ],
  },
  {
    // Still in "Iniciada", with the term to file open: `harmfulActDeadline` shows in the detail.
    sacNumber: '12355019',
    jurisdiction: 'AMPARO',
    proceduralRole: 'ACTORA',
    caption: 'OVIEDO, Agustina c/ Municipalidad de Córdoba — Amparo por mora',
    court: 'Cámara Contencioso Administrativa de 1ª Nominación — Córdoba',
    clientDni: '42011596',
    lawyer: '1-32214',
    counterparty: 'Municipalidad de Córdoba',
    subjectMatter: 'Que se ordene a la Municipalidad resolver el pedido de habilitación comercial presentado hace ocho meses.',
    injunctionGranted: false,
    harmfulAct: { daysAgo: 10, termDays: 15, termDayType: 'BUSINESS' },
    acts: [],
  },
  {
    sacNumber: '11598260',
    jurisdiction: 'AMPARO',
    proceduralRole: 'ACTORA',
    caption: 'CABRERA, Ana María c/ Caja de Jubilaciones de la Provincia — Amparo',
    court: 'Cámara Contencioso Administrativa de 3ª Nominación — Córdoba',
    clientDni: '20455306',
    lawyer: '2-19873',
    counterparty: 'Caja de Jubilaciones, Pensiones y Retiros de Córdoba',
    subjectMatter: 'Que se ordene liquidar el haber previsional conforme al cargo efectivamente desempeñado.',
    injunctionGranted: false,
    courtFeePaid: true,
    harmfulAct: { daysAgo: 90, termDays: 15, termDayType: 'BUSINESS' },
    acts: [
      { state: 'Interposición de la acción', daysAgo: 75 },
      { state: 'Pedido de informe', daysAgo: 60 },
      { state: 'Contestación del informe', dueInBusinessDays: -1 },
    ],
  },
  {
    sacNumber: '10843375',
    jurisdiction: 'AMPARO',
    proceduralRole: 'ACTORA',
    caption: 'QUINTEROS, Lorena Beatriz c/ EPEC — Amparo',
    court: 'Juzgado Civil y Comercial de 30ª Nominación — Córdoba',
    clientDni: '34129870',
    lawyer: '1-35102',
    counterparty: 'EPEC',
    subjectMatter: 'Que se ordene restablecer el suministro eléctrico del domicilio, interrumpido sin aviso previo.',
    injunctionGranted: true,
    harmfulAct: { daysAgo: 140, termDays: 15, termDayType: 'BUSINESS' },
    acts: [
      { state: 'Interposición de la acción', daysAgo: 130 },
      { state: 'Pedido de informe', daysAgo: 120 },
      { state: 'Contestación del informe', daysAgo: 105 },
      { state: 'Sentencia firme', daysAgo: 20 },
    ],
  },
  {
    // Still in "Iniciada": its harmful act renews every 30 days, so `harmfulActDeadline` shows in the detail.
    sacNumber: '12401638',
    jurisdiction: 'AMPARO',
    proceduralRole: 'ACTORA',
    caption: 'ACOSTA, Miriam del Valle c/ Municipalidad de Córdoba — Amparo ambiental',
    court: 'Cámara Contencioso Administrativa de 2ª Nominación — Córdoba',
    clientDni: '25617843',
    lawyer: '3-11208',
    counterparty: 'Municipalidad de Córdoba',
    subjectMatter: 'Que se ordene el cese del vertido de efluentes cloacales en el predio lindero al domicilio.',
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

const isBusinessDay = (date: Date): boolean => date.getUTCDay() !== 0 && date.getUTCDay() !== 6;

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
    if (isBusinessDay(current)) remaining--;
  }
  return current;
}

/** The inverse of `addBusinessDays`: from a weekday, adding `days` back gives `date` again. */
function subtractBusinessDays(date: Date, days: number): Date {
  let current = date;
  let remaining = days;
  while (remaining > 0) {
    current = addDays(current, -1);
    if (isBusinessDay(current)) remaining--;
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
 * Clients, legal qualifications and cases with their procedural acts.
 * Idempotent like the rest: clients and qualifications are looked up by the
 * rule of their partial unique index, and a case is looked up by its SAC
 * number — if it exists it is left alone, so acts registered through the app
 * are never duplicated or overwritten.
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

  // Cases are registered by a secretary, as the app does.
  const secretary = await prisma.user.findUniqueOrThrow({ where: { username: 'm.godoy' } });

  let created = 0;
  for (const devCase of DEV_CASES) {
    if (await prisma.case.findUnique({ where: { sacNumber: devCase.sacNumber } })) continue;

    const jurisdiction = await prisma.jurisdiction.findUniqueOrThrow({ where: { name: devCase.jurisdiction } });
    const client = await prisma.client.findFirstOrThrow({ where: { dni: devCase.clientDni, active: true } });
    const lawyer = await prisma.lawyer.findUniqueOrThrow({ where: { registrationNumber: devCase.lawyer } });
    // The responsible lawyer registers the acts, through their own account.
    const lawyerUser = await prisma.user.findFirstOrThrow({ where: { lawyerId: lawyer.id, active: true } });
    const initialState = await prisma.proceduralState.findFirstOrThrow({
      where: { jurisdictionId: jurisdiction.jurisdictionId, isInitial: true, isActive: true },
    });
    const isAdministrative = devCase.jurisdiction === 'ADMINISTRATIVE';
    const isAmparo = devCase.jurisdiction === 'AMPARO';
    const isCriminal = devCase.jurisdiction === 'CRIMINAL';
    const harmfulAct = devCase.harmfulAct;

    // The date of every act, before writing anything: a case whose acts come
    // out of order is a mistake in the table above, and fails the seed.
    const acts: { state: ProceduralState; actDate: Date }[] = [];
    for (const act of devCase.acts) {
      const state = await prisma.proceduralState.findFirstOrThrow({
        where: { jurisdictionId: jurisdiction.jurisdictionId, name: act.state, isActive: true },
      });
      let actDate: Date;
      if ('daysAgo' in act) {
        actDate = addDays(today, -act.daysAgo);
      } else {
        if (state.timeLimitDays <= act.dueInBusinessDays) {
          throw new Error(
            `Case ${devCase.sacNumber}: "${act.state}" has a term of ${state.timeLimitDays} business days, ` +
              `so it cannot fall due in ${act.dueInBusinessDays} without an act dated in the future.`,
          );
        }
        const countsFrom = subtractBusinessDays(today, state.timeLimitDays - act.dueInBusinessDays);
        // In the administrative jurisdiction the term runs from the notification, the day after the act (RN6).
        actDate = isAdministrative ? addDays(countsFrom, -1) : countsFrom;
      }
      const previous = acts[acts.length - 1];
      if (previous && previous.actDate >= actDate) {
        throw new Error(`Case ${devCase.sacNumber}: "${act.state}" is not later than "${previous.state.name}".`);
      }
      acts.push({ state, actDate });
    }

    // The case started in court a month before its first act (or before its harmful act, if it has none).
    const firstDate = acts[0]?.actDate ?? addDays(today, -(harmfulAct?.daysAgo ?? 30));
    const startDate = addDays(firstDate, -30);

    await prisma.$transaction(async (tx) => {
      const newCase = await tx.case.create({
        data: {
          sacNumber: devCase.sacNumber,
          caption: devCase.caption,
          court: devCase.court,
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
            // As stored at registration: from the offense. The read side recalculates it from the last interruptive act.
            prescriptionDate: addMonths(offenseDate, qualification.prescriptionMonths),
          },
        });
      }

      for (const interruptive of devCase.interruptiveActs ?? []) {
        await tx.interruptiveAct.create({
          data: {
            caseId: newCase.id,
            name: interruptive.name,
            actDate: addDays(today, -interruptive.daysAgo),
            registeredByUserId: lawyerUser.id,
            registeredByLawyerId: lawyer.id,
          },
        });
      }

      let lastActId: number | null = null;
      let lastStateId = initialState.stateId;
      for (const { state, actDate } of acts) {
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
      `${created} new cases of ${DEV_CASES.length}.`,
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
