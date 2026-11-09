import { PrismaClient } from '../../src/generated/prisma/client';
import {
  CUSTOM_STATES,
  INITIAL_STATE_NAME,
  INTERRUPTIVE_ACTS,
  JurisdictionCode,
  LEGAL_QUALIFICATIONS,
  LIFECYCLES,
  PRESCRIBED_STATE_NAME,
  PROCEDURAL_STATES,
  StateSeed,
} from './legal-parameters';
import { CLIENT_FIRST_NAMES, CLIENT_LAST_NAMES, DEV_USERS, NEIGHBOURHOODS, PASSPORT_CLIENTS, STREETS } from './people';

/**
 * Clients and cases of the presentation fixture.
 *
 * Every date is computed from the presentation day (`SEED_PRESENTATION_DATE`,
 * the 11th of November by default), so that on that day each lawyer has terms
 * overdue, due that very day and due in the days after, plus cases without a
 * term, closed ones and prescribed ones. Nothing else in the fixture is a
 * literal date.
 *
 * Acts are never dated after `latestActDate` (the last weekday at least three
 * days before the presentation): the app rejects an act dated after today, and
 * the fixture is loaded in the days before it.
 *
 * The data are pseudo-random from a fixed seed: two loads into an empty
 * database give the same fixture. What the app would compute at registration
 * is computed here the same way and written as the app writes it — the term of
 * the state copied into the act (CA-26.6), the case moved to the state of its
 * latest act, the prescription date of each offense from the interruptive
 * acts that restarted it (RN8, D-113), the declaration of a prescribed case
 * on each of its offenses (D-113). Business days skip weekends only, as the app's
 * calculator does (P-02).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Dates ───────────────────────────────────────────────────────────────────

export function civilDate(iso: string): Date {
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(date.getTime())) {
    throw new Error(`"${iso}" is not a date in YYYY-MM-DD format.`);
  }
  return date;
}

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);
const isWeekday = (date: Date): boolean => date.getUTCDay() !== 0 && date.getUTCDay() !== 6;
const daysBetween = (from: Date, to: Date): number => Math.round((to.getTime() - from.getTime()) / DAY_MS);
const isoOf = (date: Date): string => date.toISOString().slice(0, 10);

/** The same rule as the app's calculator: counted from the day after, weekends skipped. */
function addBusinessDays(date: Date, days: number): Date {
  let current = date;
  for (let remaining = days; remaining > 0; ) {
    current = addDays(current, 1);
    if (isWeekday(current)) remaining--;
  }
  return current;
}

function subBusinessDays(date: Date, days: number): Date {
  let current = date;
  for (let remaining = days; remaining > 0; ) {
    current = addDays(current, -1);
    if (isWeekday(current)) remaining--;
  }
  return current;
}

const shiftBusinessDays = (date: Date, days: number): Date =>
  days >= 0 ? addBusinessDays(date, days) : subBusinessDays(date, -days);

/** The date itself if it is a weekday, otherwise the Friday before. */
function weekdayOnOrBefore(date: Date): Date {
  let current = date;
  while (!isWeekday(current)) current = addDays(current, -1);
  return current;
}

/** Same as `addPrescriptionMonths` (`prescription.ts`): a shorter month falls on its last day. */
function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

/**
 * Same as `prescriptionStartsOn` (`prescription.ts`, D-113, CA-31.14): the
 * interruptive acts in date order, each restarting the term only if it falls
 * between the start in force and its expiry, and before the declared
 * prescription. An act once the offense prescribed does not revive it.
 */
function prescriptionStartsOn(
  offense: { offenseDate: Date; prescriptionMonths: number },
  interruptiveActDates: readonly Date[],
  declaredOn: Date | null,
): Date {
  let startsOn = offense.offenseDate;
  for (const actDate of [...interruptiveActDates].sort((a, b) => a.getTime() - b.getTime())) {
    const expiresOn = addMonths(startsOn, offense.prescriptionMonths);
    if (actDate >= startsOn && actDate < expiresOn && (declaredOn === null || actDate < declaredOn)) {
      startsOn = actDate;
    }
  }
  return startsOn;
}

/** A civil date at a time of day in Córdoba (UTC−3), for timestamps. */
const atHour = (date: Date, hour: number): Date => new Date(date.getTime() + (hour + 3) * 60 * 60 * 1000);

// ─── Pseudo-random numbers ───────────────────────────────────────────────────

/** Mulberry32: small and deterministic, so the fixture is the same on every load. */
class Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  weighted<T>(items: readonly { item: T; weight: number }[]): T {
    const total = items.reduce((sum, { weight }) => sum + weight, 0);
    let roll = this.next() * total;
    for (const { item, weight } of items) {
      roll -= weight;
      if (roll < 0) return item;
    }
    return items[items.length - 1].item;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

// ─── What each lawyer gets ───────────────────────────────────────────────────

/**
 * How a case stands on the presentation day.
 *   due        its open term falls `days` business days from that day (negative: overdue).
 *              `manual`: the lawyer moved the due date by hand.
 *   noTerm     its current state opens no term.
 *   custom     its current state was written by hand; `days`, a due date entered by hand.
 *   initial    no act yet ("Iniciada"); an amparo shows the term to file it.
 *   closed     in a terminal state.
 *   prescribed declared prescribed (HU33).
 */
type Ending =
  | { kind: 'due'; days: number; manual?: boolean }
  | { kind: 'noTerm' }
  | { kind: 'custom'; days?: number }
  | { kind: 'initial'; days: number }
  | { kind: 'closed' }
  | { kind: 'prescribed' };

/** How the prescription of a criminal case stands on that day. */
type PrescriptionProfile = 'fresh' | 'alert' | 'expired' | 'interrupted' | 'declared';

const due = (days: number, manual = false): Ending => ({ kind: 'due', days, manual });

/**
 * Between 10 and 15 active cases per lawyer, and a few closed and prescribed
 * ones on top. The first entries are what every lawyer gets; the ones left out
 * when a lawyer has fewer than 13 come last among them.
 */
function endingsOfLawyer(random: Random): Ending[] {
  const core: Ending[] = [
    due(-2),
    due(-1),
    due(0),
    due(0),
    due(1),
    due(2),
    due(5),
    { kind: 'noTerm' },
    { kind: 'custom', days: 4 },
    { kind: 'initial', days: 2 },
  ];
  const optional: Ending[] = [due(-4), due(3), due(8)];
  const extra: Ending[] = [due(-1, true), due(2), { kind: 'noTerm' }, due(6), { kind: 'custom' }, due(12)];

  const activeCount = random.int(10, 15);
  const active = [...core, ...optional.slice(0, Math.min(optional.length, activeCount - core.length))];
  active.push(...extra.slice(0, Math.max(0, activeCount - active.length)));

  const closed: Ending[] = [{ kind: 'closed' }, { kind: 'closed' }, { kind: 'prescribed' }];
  if (random.chance(0.5)) closed.push({ kind: 'closed' });
  return [...active, ...closed];
}

/** The jurisdiction each case starts from, in turn; a term the jurisdiction cannot reach moves it to another. */
const JURISDICTION_TURNS: readonly JurisdictionCode[] = [
  'CRIMINAL', 'ADMINISTRATIVE', 'CRIMINAL', 'AMPARO', 'CRIMINAL', 'ADMINISTRATIVE', 'AMPARO', 'CRIMINAL',
];

// ─── Pools of case data ──────────────────────────────────────────────────────

const INSTRUCTORS = [
  'Dra. Mónica Argüello', 'Dr. Pablo Rinaldi', 'Dra. Inés Bertoldi', 'Dr. Gustavo Paredes', 'Dra. Alejandra Sosa',
  'Dr. Martín Oliva', 'Dra. Cecilia Bonetto', 'Dr. Ricardo Bianchi', 'Dra. Paula Arias', 'Dr. Esteban Ferrer',
  'Dra. Laura Gigena', 'Dr. Javier Tissera',
];

const DISCIPLINARY_BODIES = [
  'Policía de la Provincia de Córdoba',
  'Servicio Penitenciario de Córdoba',
  'Ministerio de Educación de la Provincia',
  'Ministerio de Salud de la Provincia',
  'Municipalidad de Córdoba',
];

const DISCIPLINARY_MATTERS = [
  'Descargo frente a la imputación de falta grave por presunto abandono de servicio.',
  'Defensa en el sumario por supuestas inasistencias injustificadas reiteradas.',
  'Defensa frente a la imputación por presunto uso indebido de bienes del Estado.',
  'Descargo por la supuesta falta de respeto a un superior jerárquico.',
  'Defensa en el sumario por presunta irregularidad en el manejo de fondos de caja chica.',
  'Descargo frente a la imputación por la pérdida de documentación a su cargo.',
];

const CLAIMS = [
  ['Provincia de Córdoba', 'Impugnación de la cesantía dispuesta y pedido de reincorporación con pago de haberes caídos.'],
  ['Caja de Jubilaciones, Pensiones y Retiros de Córdoba', 'Nulidad de la resolución que denegó el beneficio jubilatorio.'],
  ['Dirección General de Rentas', 'Impugnación de la multa impuesta y pedido de su revocación.'],
  ['Municipalidad de Córdoba', 'Nulidad de la sanción de suspensión por treinta días.'],
  ['Ministerio de Educación de la Provincia', 'Reclamo por diferencias salariales del adicional por zona desfavorable.'],
] as const;

const AMPAROS = [
  ['APROSS', 'Que se ordene la cobertura integral del tratamiento de rehabilitación prescripto.'],
  ['APROSS', 'Que se ordene la entrega de la medicación oncológica prescripta.'],
  ['PAMI', 'Que se ordene la provisión de la prótesis de cadera indicada por el médico tratante.'],
  ['Ministerio de Salud de la Provincia', 'Que se garantice el turno quirúrgico pendiente desde hace seis meses.'],
  ['Municipalidad de Córdoba', 'Que se ordene el cese del vertido de efluentes en el predio lindero.'],
  ['Municipalidad de Córdoba', 'Que se disponga la remoción de los residuos acumulados en el espacio verde del barrio.'],
  ['EPEC', 'Que se restablezca el suministro eléctrico a un usuario electrodependiente.'],
  ['Aguas Cordobesas S.A.', 'Que se restablezca el servicio de agua potable cortado sin intimación previa.'],
  ['Ministerio de Educación de la Provincia', 'Que se garantice la inscripción del menor en la escuela más cercana a su domicilio.'],
  ['Ministerio de Educación de la Provincia', 'Que se designe una maestra de apoyo para el alumno con discapacidad.'],
  ['Caja de Jubilaciones, Pensiones y Retiros de Córdoba', 'Que se resuelva el trámite de pensión demorado más allá de los plazos legales.'],
] as const;

const ACT_NOTES = [
  'Se notificó en el domicilio procesal constituido.',
  'Escrito presentado en término por mesa de entradas.',
  'Se informó al cliente por correo electrónico.',
  'Pendiente de agregar la cédula de notificación.',
  'Se pidió copia de las actuaciones.',
  'Se conversó la estrategia con el cliente.',
  'Notificado por cédula electrónica.',
];

const ORDINALS = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª', '11ª', '12ª'];

// ─── The plan, in memory ─────────────────────────────────────────────────────

interface StateRef {
  stateName: string | null;
  customState: string | null;
}

interface PlannedAct extends StateRef {
  actDate: Date;
  notificationDate: Date | null;
  timeLimitDays: number;
  dayType: 'NONE' | 'BUSINESS' | 'CONSECUTIVE';
  countsFrom: Date;
  computedDueDate: Date | null;
  manualDueDate: Date | null;
  notes: string | null;
  interruptive: boolean;
}

interface PlannedOffense {
  qualification: string;
  prescriptionMonths: number;
  offenseDate: Date;
}

interface PlannedClient {
  lastName: string;
  firstName: string;
  documentType: 'DNI' | 'PASSPORT';
  documentNumber: string;
  address: string;
  phone: string;
  email: string | null;
  clientSince: Date | null;
}

interface PlannedCase {
  lawyerIndex: number;
  ending: Ending;
  jurisdiction: JurisdictionCode;
  proceduralRole: 'DEFENSA' | 'QUERELLANTE_PARTICULAR' | 'RECURRENTE' | 'ACTORA';
  clientIndex: number;
  caption: string;
  court: string | null;
  instructorName: string | null;
  instructorPhone: string | null;
  instructorExtension: string | null;
  counterparty: string | null;
  subjectMatter: string | null;
  sacNumber: string | null;
  startDate: Date | null;
  createdAt: Date;
  createdBySecretary: boolean;
  courtFeePaid: boolean;
  clientDetained: boolean | null;
  injunctionGranted: boolean | null;
  harmfulAct: { date: Date; renewalDays: number | null } | null;
  administrativeRemedyExhaustedOn: Date | null;
  acts: PlannedAct[];
  offenses: PlannedOffense[];
  interruptiveActs: { name: string; actDate: Date }[];
  profile: PrescriptionProfile | null;
  declaration: { date: Date; resolution: string; grounds: string } | null;
}

const stateIndex = new Map(PROCEDURAL_STATES.map((state) => [`${state.jurisdiction}:${state.name}`, state]));

function stateOf(jurisdiction: JurisdictionCode, name: string): StateSeed {
  const state = stateIndex.get(`${jurisdiction}:${name}`);
  if (!state) throw new Error(`Lifecycle step "${name}" is not a state of ${jurisdiction}.`);
  return state;
}

const stepName = (step: string): string => (step.startsWith('?') ? step.slice(1) : step);

/** A place where a case can end: a lifecycle cut at one of its steps. */
interface Cut {
  lifecycle: readonly string[];
  index: number;
}

function cutsWhere(jurisdiction: JurisdictionCode, accepts: (state: StateSeed, cut: Cut) => boolean): Cut[] {
  const cuts: Cut[] = [];
  for (const lifecycle of LIFECYCLES[jurisdiction]) {
    lifecycle.forEach((step, index) => {
      const cut = { lifecycle, index };
      if (accepts(stateOf(jurisdiction, stepName(step)), cut)) cuts.push(cut);
    });
  }
  return cuts;
}

/** The steps up to the cut: an optional step is skipped half of the time, never the last one. */
function stepsOf(cut: Cut, random: Random): string[] {
  const steps: string[] = [];
  cut.lifecycle.slice(0, cut.index + 1).forEach((step, index) => {
    if (step.startsWith('?') && index !== cut.index && random.chance(0.5)) return;
    steps.push(stepName(step));
  });
  return steps;
}

/**
 * Long lifecycles weigh more: they give a case more acts to show. A cut before
 * the third step is taken only when nothing later fits.
 */
function pickCut(cuts: Cut[], random: Random): Cut {
  const later = cuts.filter((cut) => cut.index >= 2);
  const pool = later.length > 0 ? later : cuts;
  return random.weighted(pool.map((cut) => ({ item: cut, weight: 1 + Math.min(cut.index, 8) })));
}

class CasePlanner {
  private readonly random: Random;
  private readonly sacNumbers = new Set<string>();

  constructor(
    seed: number,
    private readonly presentationDay: Date,
    private readonly latestActDate: Date,
  ) {
    this.random = new Random(seed);
  }

  /** The due date `days` business days from the presentation day. */
  private dueOn(days: number): Date {
    return shiftBusinessDays(this.presentationDay, days);
  }

  /** Where a term of `timeLimitDays` has to count from to fall on `dueDate`, if the act can be dated that early. */
  private countsFromFor(dueDate: Date, timeLimitDays: number): Date | null {
    const countsFrom = subBusinessDays(dueDate, timeLimitDays);
    return countsFrom <= this.latestActDate ? countsFrom : null;
  }

  planClients(count: number): PlannedClient[] {
    const random = this.random;
    const clients: PlannedClient[] = [];
    const names = new Set<string>();
    const documents = new Set<string>();
    while (clients.length < count) {
      const lastName = random.pick(CLIENT_LAST_NAMES);
      const firstName = random.pick(CLIENT_FIRST_NAMES);
      if (names.has(`${lastName}, ${firstName}`)) continue;
      names.add(`${lastName}, ${firstName}`);
      let documentNumber: string;
      do documentNumber = String(random.int(14_000_000, 46_999_999));
      while (documents.has(documentNumber));
      documents.add(documentNumber);
      clients.push(this.client(lastName, firstName, 'DNI', documentNumber));
    }
    for (const [lastName, firstName, passport] of PASSPORT_CLIENTS) {
      clients.splice(random.int(0, clients.length), 0, this.client(lastName, firstName, 'PASSPORT', passport));
    }
    return clients;
  }

  private client(lastName: string, firstName: string, documentType: 'DNI' | 'PASSPORT', documentNumber: string): PlannedClient {
    const random = this.random;
    const asciiLast = lastName.normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase();
    const asciiFirst = firstName.normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase();
    return {
      lastName,
      firstName,
      documentType,
      documentNumber,
      address: `${random.pick(STREETS)} ${random.int(80, 4800)}, B° ${random.pick(NEIGHBOURHOODS)}, Córdoba`,
      phone: `351 ${random.int(150, 799)}-${String(random.int(0, 9999)).padStart(4, '0')}`,
      email: random.chance(0.6) ? `${asciiFirst.slice(0, 1)}${asciiLast}${random.int(1, 99)}@example.com` : null,
      clientSince: null,
    };
  }

  planCases(lawyerCount: number, clients: PlannedClient[]): PlannedCase[] {
    const random = this.random;
    const cases: PlannedCase[] = [];
    let turn = 0;
    for (let lawyerIndex = 0; lawyerIndex < lawyerCount; lawyerIndex++) {
      const ofLawyer: PlannedCase[] = [];
      for (const ending of endingsOfLawyer(random)) {
        const preferred = ending.kind === 'prescribed' ? 'CRIMINAL' : JURISDICTION_TURNS[turn++ % JURISDICTION_TURNS.length];
        ofLawyer.push(this.planCase(lawyerIndex, ending, preferred));
      }
      this.assignPrescriptionProfiles(ofLawyer);
      ofLawyer.forEach((planned) => this.datePrefixAndOffenses(planned));
      cases.push(...ofLawyer);
    }
    this.assignClients(cases, clients);
    return cases;
  }

  /** Two cases per lawyer near prescription, one past it, two whose term an interruptive act restarted. */
  private assignPrescriptionProfiles(cases: PlannedCase[]): void {
    const quota: PrescriptionProfile[] = ['alert', 'alert', 'expired', 'interrupted', 'interrupted'];
    const candidates = this.random.shuffle(
      cases.filter((c) => c.jurisdiction === 'CRIMINAL' && c.profile === null && c.acts.length >= 2 && c.ending.kind !== 'closed'),
    );
    for (const planned of candidates) {
      planned.profile = quota.shift() ?? 'fresh';
    }
    for (const planned of cases) {
      if (planned.jurisdiction === 'CRIMINAL' && planned.profile === null) planned.profile = 'fresh';
    }
  }

  private planCase(lawyerIndex: number, ending: Ending, preferred: JurisdictionCode): PlannedCase {
    const order: JurisdictionCode[] = [preferred, ...(['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const).filter((j) => j !== preferred)];
    for (const jurisdiction of order) {
      const acts = this.planFinalStretch(jurisdiction, ending);
      if (acts !== null) return this.withCaseData(lawyerIndex, ending, jurisdiction, acts);
    }
    throw new Error(`No jurisdiction can end a case as ${JSON.stringify(ending)}.`);
  }

  /**
   * The steps of the case, with only the last act dated: the one that decides
   * how the case stands. The earlier ones are dated later, backwards from it,
   * once the prescription profile says how far back they may go.
   */
  private planFinalStretch(jurisdiction: JurisdictionCode, ending: Ending): PlannedAct[] | null {
    const random = this.random;
    const undated = (ref: StateRef): PlannedAct => this.act(jurisdiction, ref, this.latestActDate);

    switch (ending.kind) {
      case 'initial':
        return [];

      case 'due': {
        // With a manual due date, the table's term falls two days earlier and the lawyer moved it.
        const target = this.dueOn(ending.days);
        const computedTarget = ending.manual ? subBusinessDays(target, 2) : target;
        const cuts = cutsWhere(
          jurisdiction,
          (state) => !state.terminal && state.timeLimitDays > 0 && this.countsFromFor(computedTarget, state.timeLimitDays) !== null,
        );
        if (cuts.length === 0) return null;
        const steps = stepsOf(pickCut(cuts, random), random);
        const last = stateOf(jurisdiction, steps[steps.length - 1]);
        const countsFrom = this.countsFromFor(computedTarget, last.timeLimitDays)!;
        const actDate = jurisdiction === 'ADMINISTRATIVE' ? subBusinessDays(countsFrom, random.int(1, 2)) : countsFrom;
        const acts = steps.slice(0, -1).map((name) => undated({ stateName: name, customState: null }));
        const final = this.act(jurisdiction, { stateName: last.name, customState: null }, actDate, countsFrom);
        if (ending.manual) final.manualDueDate = target;
        return this.withCustomStep(jurisdiction, [...acts, final]);
      }

      case 'noTerm': {
        const cuts = cutsWhere(jurisdiction, (state, cut) => !state.terminal && state.timeLimitDays === 0 && cut.index >= 1);
        if (cuts.length === 0) return null;
        const steps = stepsOf(pickCut(cuts, random), random);
        const actDate = weekdayOnOrBefore(addDays(this.latestActDate, -random.int(0, 75)));
        const acts = steps.map((name) => undated({ stateName: name, customState: null }));
        acts[acts.length - 1] = this.act(jurisdiction, acts[acts.length - 1], actDate);
        return this.withCustomStep(jurisdiction, acts);
      }

      case 'custom': {
        const cuts = cutsWhere(jurisdiction, (state, cut) => !state.terminal && cut.index >= 1);
        const steps = stepsOf(pickCut(cuts, random), random);
        const actDate = weekdayOnOrBefore(addDays(this.latestActDate, -random.int(2, 40)));
        const custom = this.act(jurisdiction, { stateName: null, customState: random.pick(CUSTOM_STATES[jurisdiction]) }, actDate);
        if (ending.days !== undefined) custom.manualDueDate = this.dueOn(ending.days);
        return [...steps.map((name) => undated({ stateName: name, customState: null })), custom];
      }

      case 'closed': {
        const cuts = cutsWhere(jurisdiction, (state, cut) => state.terminal && cut.index === cut.lifecycle.length - 1);
        const steps = stepsOf(pickCut(cuts, random), random);
        const actDate = weekdayOnOrBefore(addDays(this.presentationDay, -random.int(20, 420)));
        const acts = steps.map((name) => undated({ stateName: name, customState: null }));
        acts[acts.length - 1] = this.act(jurisdiction, acts[acts.length - 1], actDate);
        return this.withCustomStep(jurisdiction, acts);
      }

      case 'prescribed': {
        if (jurisdiction !== 'CRIMINAL') return null;
        const cuts = cutsWhere(jurisdiction, (state, cut) => !state.terminal && cut.index >= 1 && cut.index <= 7);
        const steps = stepsOf(pickCut(cuts, random), random);
        const declaredOn = weekdayOnOrBefore(addDays(this.latestActDate, -random.int(3, 80)));
        const actDate = weekdayOnOrBefore(addDays(declaredOn, -random.int(20, 120)));
        const acts = steps.map((name) => undated({ stateName: name, customState: null }));
        acts[acts.length - 1] = this.act(jurisdiction, acts[acts.length - 1], actDate);
        // Kept aside until the case data exist; `withCaseData` fills it in.
        this.pendingDeclaration = declaredOn;
        return acts;
      }
    }
  }

  private pendingDeclaration: Date | null = null;

  /** Now and then a step written by hand in the middle of the lifecycle. */
  private withCustomStep(jurisdiction: JurisdictionCode, acts: PlannedAct[]): PlannedAct[] {
    if (acts.length < 3 || !this.random.chance(0.15)) return acts;
    const at = this.random.int(1, acts.length - 1);
    const custom = this.act(jurisdiction, { stateName: null, customState: this.random.pick(CUSTOM_STATES[jurisdiction]) }, this.latestActDate);
    return [...acts.slice(0, at), custom, ...acts.slice(at)];
  }

  /**
   * An act and the term its state opens (RN5). `countsFrom` is given only for
   * the last act of a case, whose term has to fall on a given day; for the rest
   * it is the act date, or a notification a few days later in the
   * administrative jurisdiction (RN6).
   */
  private act(jurisdiction: JurisdictionCode, ref: StateRef, actDate: Date, countsFrom?: Date): PlannedAct {
    const state = ref.stateName === null ? null : stateOf(jurisdiction, ref.stateName);
    const timeLimitDays = state?.timeLimitDays ?? 0;
    const opensTerm = timeLimitDays > 0;
    const notificationDate =
      jurisdiction === 'ADMINISTRATIVE' && opensTerm
        ? (countsFrom ?? addBusinessDays(actDate, this.random.int(1, 3)))
        : null;
    const from = notificationDate ?? actDate;
    return {
      ...ref,
      actDate,
      notificationDate,
      timeLimitDays,
      dayType: state?.dayType ?? 'NONE',
      countsFrom: from,
      computedDueDate: opensTerm ? addBusinessDays(from, timeLimitDays) : null,
      manualDueDate: null,
      notes: this.random.chance(0.3) ? this.random.pick(ACT_NOTES) : null,
      interruptive: INTERRUPTIVE_ACTS.some((i) => i.withState === ref.stateName),
    };
  }

  private withCaseData(lawyerIndex: number, ending: Ending, jurisdiction: JurisdictionCode, acts: PlannedAct[]): PlannedCase {
    const random = this.random;
    const states = acts.map((a) => a.stateName);
    const has = (name: string) => states.includes(name);
    const isInitial = ending.kind === 'initial';

    let proceduralRole: PlannedCase['proceduralRole'];
    let counterparty: string | null = null;
    let subjectMatter: string | null = null;
    let court: string;
    if (jurisdiction === 'CRIMINAL') {
      proceduralRole = random.chance(0.15) ? 'QUERELLANTE_PARTICULAR' : 'DEFENSA';
      court = has('Citación a juicio')
        ? `Cámara en lo Criminal y Correccional de ${random.pick(ORDINALS)} Nominación · Córdoba`
        : `Juzgado de Control N° ${random.int(1, 9)} · Córdoba`;
    } else if (jurisdiction === 'ADMINISTRATIVE') {
      const claim = acts.length > 0 && acts[0].stateName === 'Resolución sancionatoria';
      if (claim || (isInitial && random.chance(0.5))) {
        const [body, matter] = random.pick(CLAIMS);
        proceduralRole = 'RECURRENTE';
        counterparty = body;
        subjectMatter = matter;
      } else {
        proceduralRole = 'DEFENSA';
        counterparty = random.pick(DISCIPLINARY_BODIES);
        subjectMatter = random.pick(DISCIPLINARY_MATTERS);
      }
      court = has('Demanda contencioso-administrativa interpuesta')
        ? `Cámara Contencioso Administrativa de ${random.pick(ORDINALS.slice(0, 4))} Nominación · Córdoba`
        : `Instrucción sumarial · ${counterparty}`;
    } else {
      const [body, matter] = random.pick(AMPAROS);
      proceduralRole = 'ACTORA';
      counterparty = body;
      subjectMatter = matter;
      court = has('Elevación a la Cámara')
        ? `Cámara de Apelaciones en lo Civil y Comercial de ${random.pick(ORDINALS.slice(0, 9))} Nominación · Córdoba`
        : `Juzgado Civil y Comercial de ${random.int(1, 51)}ª Nominación · Córdoba`;
    }

    // A brand-new case may still have no SAC number, and then no start date either (D-33).
    const withoutSac = isInitial && random.chance(0.4);
    let sacNumber: string | null = null;
    if (!withoutSac) {
      do sacNumber = String(random.int(10_000_000, 13_999_999));
      while (this.sacNumbers.has(sacNumber));
      this.sacNumbers.add(sacNumber);
    }

    const declaredOn = ending.kind === 'prescribed' ? this.pendingDeclaration : null;
    this.pendingDeclaration = null;

    // Only a defendant can be in custody: a private prosecutor is the victim.
    const detained =
      jurisdiction === 'CRIMINAL'
        ? proceduralRole === 'DEFENSA' &&
          ((has('Prisión preventiva') &&
            ending.kind !== 'closed' &&
            !has('Sentencia absolutoria') &&
            !has('Sobreseimiento') &&
            !has('Suspensión del juicio a prueba')) ||
            random.chance(0.08))
        : null;

    return {
      lawyerIndex,
      ending,
      jurisdiction,
      proceduralRole,
      clientIndex: -1,
      caption: '',
      court: isInitial && random.chance(0.5) ? null : court,
      instructorName: isInitial ? null : random.pick(INSTRUCTORS),
      instructorPhone: isInitial ? null : `0351 448-${String(random.int(1000, 9999))}`,
      instructorExtension: isInitial ? null : String(random.int(100, 899)),
      counterparty,
      subjectMatter,
      sacNumber,
      startDate: null,
      createdAt: this.presentationDay,
      createdBySecretary: random.chance(0.6),
      courtFeePaid: isInitial ? random.chance(0.2) : random.chance(0.7),
      clientDetained: detained,
      injunctionGranted: jurisdiction === 'AMPARO' ? has('Medida de no innovar dictada') : null,
      harmfulAct: null,
      administrativeRemedyExhaustedOn: null,
      acts,
      offenses: [],
      interruptiveActs: [],
      profile: ending.kind === 'prescribed' ? 'declared' : null,
      declaration: declaredOn ? { date: declaredOn, resolution: '', grounds: '' } : null,
    };
  }

  /**
   * Dates the earlier acts backwards from the last one, then the start of the
   * case, its harmful act and its offenses. A criminal case near prescription
   * has an old offense, so its acts are squeezed in after it.
   */
  private datePrefixAndOffenses(planned: PlannedCase): void {
    const random = this.random;
    const { jurisdiction, acts } = planned;
    const gapRange = jurisdiction === 'CRIMINAL' ? [15, 70] : jurisdiction === 'ADMINISTRATIVE' ? [12, 50] : [4, 18];

    const main = jurisdiction === 'CRIMINAL' ? this.mainOffense(planned) : null;
    // A case after its offense: the first act two months later, so the start
    // of the case also falls after the other offenses (up to 10 days later).
    const earliestFirstAct = main && main.offenseDate ? addDays(main.offenseDate, 60) : null;

    if (acts.length > 0) {
      const gaps = acts.slice(1).map(() => random.int(gapRange[0], gapRange[1]));
      const last = acts[acts.length - 1].actDate;
      const span = gaps.reduce((sum, gap) => sum + gap, 0);
      const room = earliestFirstAct ? daysBetween(earliestFirstAct, last) : Infinity;
      const scale = span > room ? room / span : 1;
      let date = last;
      for (let i = acts.length - 2; i >= 0; i--) {
        date = weekdayOnOrBefore(addDays(date, -Math.max(3, Math.floor(gaps[i] * scale))));
        acts[i] = this.redate(jurisdiction, acts[i], date, acts[i + 1].actDate);
      }
    }

    if (acts.length > 0) {
      planned.startDate = weekdayOnOrBefore(addDays(acts[0].actDate, -random.int(5, 40)));
    } else if (planned.sacNumber !== null) {
      planned.startDate = weekdayOnOrBefore(addDays(this.latestActDate, -random.int(1, 25)));
    }
    const registeredOn = planned.startDate ?? weekdayOnOrBefore(addDays(this.latestActDate, -random.int(0, 10)));
    planned.createdAt = atHour(addDays(registeredOn, 1), random.int(9, 13));

    if (jurisdiction === 'AMPARO') {
      planned.harmfulAct = this.harmfulActOf(planned, registeredOn);
    }
    if (jurisdiction === 'ADMINISTRATIVE') {
      const exhausted = acts.find((a) => a.stateName === 'Resolución que agota la vía administrativa');
      planned.administrativeRemedyExhaustedOn = exhausted ? exhausted.countsFrom : null;
    }

    if (main) {
      // `fresh` and the initial cases: an offense a few months before the case started.
      if (main.offenseDate === null) {
        main.offenseDate = addDays(registeredOn, -random.int(20, 240));
      }
      planned.offenses = this.withMoreOffenses(main as PlannedOffense);
      if (planned.profile === 'interrupted' || (planned.profile === 'fresh' && random.chance(0.25))) {
        planned.interruptiveActs = INTERRUPTIVE_ACTS.flatMap(({ name, withState }) => {
          const act = acts.find((a) => a.stateName === withState);
          return act ? [{ name, actDate: act.actDate }] : [];
        }).slice(0, random.int(1, 3));
      }
      // Since D-113 an act after the expiry does not restart the term. An
      // "interrupted" case whose first act came too late moves its offenses
      // forward, so that act falls a few days before the expiry: without it
      // the case would have prescribed, with it the term starts over.
      if (planned.profile === 'interrupted' && planned.interruptiveActs.length > 0) {
        const first = planned.interruptiveActs.reduce((min, act) => (act.actDate < min ? act.actDate : min), planned.interruptiveActs[0].actDate);
        if (first >= addMonths(main.offenseDate, main.prescriptionMonths)) {
          const target = addMonths(addDays(first, random.int(5, 60)), -main.prescriptionMonths);
          const shift = daysBetween(main.offenseDate, target);
          planned.offenses.forEach((offense) => (offense.offenseDate = addDays(offense.offenseDate, shift)));
        }
      }
      if (planned.declaration) {
        planned.declaration.resolution = `Auto N° ${random.int(40, 480)}/${planned.declaration.date.getUTCFullYear()} · ${planned.court}`;
        planned.declaration.grounds =
          `Transcurrió el plazo del art. 62 inc. 2 CP para ${main.qualification.split(' — ')[0].toLowerCase()} ` +
          'sin actos que interrumpieran la prescripción (art. 67 CP).';
      }
    }
  }

  /** An act dated again once its place in the case is known; the next act must come after its notification. */
  private redate(jurisdiction: JurisdictionCode, act: PlannedAct, actDate: Date, nextActDate: Date): PlannedAct {
    const redated = this.act(jurisdiction, act, actDate);
    redated.notes = act.notes;
    if (redated.notificationDate && redated.notificationDate > nextActDate) {
      redated.notificationDate = nextActDate;
      redated.countsFrom = nextActDate;
      redated.computedDueDate = addBusinessDays(nextActDate, redated.timeLimitDays);
    }
    return redated;
  }

  /**
   * The offense that governs the prescription, dated by the profile. `null`
   * offense date: decided once the start of the case is known.
   */
  private mainOffense(planned: PlannedCase): { qualification: string; prescriptionMonths: number; offenseDate: Date | null } {
    const random = this.random;
    const profile = planned.profile ?? 'fresh';
    const short = profile === 'alert' || profile === 'expired' || profile === 'declared';
    const qualification = random.pick(
      LEGAL_QUALIFICATIONS.filter((q) => (short ? q.prescriptionMonths <= 72 : q.prescriptionMonths >= 60)),
    );
    const months = qualification.prescriptionMonths;
    const offense = { qualification: qualification.name, prescriptionMonths: months, offenseDate: null as Date | null };
    const today = this.presentationDay;

    if (profile === 'alert') {
      // Between 72 % and 95 % of the term elapsed on the presentation day.
      const total = daysBetween(addMonths(today, -months), today);
      offense.offenseDate = addMonths(addDays(today, Math.round(total * (1 - random.float(0.72, 0.95)))), -months);
    } else if (profile === 'expired') {
      offense.offenseDate = addMonths(addDays(today, -random.int(5, 160)), -months);
    } else if (profile === 'declared') {
      offense.offenseDate = addMonths(addDays(planned.declaration!.date, -random.int(10, 200)), -months);
    } else if (profile === 'interrupted') {
      // Old enough that, without its interruptive acts, it would be close to prescribing or past it.
      offense.offenseDate = addDays(today, -Math.round(months * 30.4 * random.float(0.8, 1.15)));
    }
    return offense;
  }

  /** Sometimes one or two more offenses, which prescribe later: the governing one stays the same. */
  private withMoreOffenses(main: PlannedOffense): PlannedOffense[] {
    const random = this.random;
    const offenses = [main];
    const more = random.chance(0.3) ? (random.chance(0.3) ? 2 : 1) : 0;
    const later = this.random.shuffle(
      LEGAL_QUALIFICATIONS.filter((q) => q.name !== main.qualification && q.prescriptionMonths >= main.prescriptionMonths),
    );
    for (const qualification of later.slice(0, more)) {
      offenses.push({
        qualification: qualification.name,
        prescriptionMonths: qualification.prescriptionMonths,
        offenseDate: addDays(main.offenseDate, random.int(0, 10)),
      });
    }
    return offenses;
  }

  /**
   * The harmful act of an amparo (D-78), with the 15 business days of art. 2
   * inc. e Ley 4915. A case still in "Iniciada" shows that term, so it is dated
   * to fall around the presentation day; some renew every 30 days.
   */
  private harmfulActOf(planned: PlannedCase, registeredOn: Date): { date: Date; renewalDays: number | null } {
    const random = this.random;
    if (planned.ending.kind !== 'initial') {
      return { date: subBusinessDays(registeredOn, random.int(2, 12)), renewalDays: null };
    }
    const latest = subBusinessDays(this.dueOn(planned.ending.days), 15);
    return random.chance(0.4) ? { date: addDays(latest, -60), renewalDays: 30 } : { date: latest, renewalDays: null };
  }

  /** Each case gets a client; some clients have several cases and a few have none yet. */
  private assignClients(cases: PlannedCase[], clients: PlannedClient[]): void {
    const random = this.random;
    const withCases = Math.min(clients.length - 12, cases.length);
    const order = random.shuffle(cases.map((_, index) => index));
    order.forEach((caseIndex, n) => {
      cases[caseIndex].clientIndex = n < withCases ? n : random.int(0, Math.floor(withCases / 2));
    });

    for (const planned of cases) {
      const client = clients[planned.clientIndex];
      const name = `${client.lastName}, ${client.firstName}`;
      planned.caption = this.captionOf(planned, name);
      const since = addDays(planned.startDate ?? planned.createdAt, -random.int(0, 20));
      const civilSince = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate()));
      if (client.clientSince === null || civilSince < client.clientSince) client.clientSince = civilSince;
    }
    for (const client of clients) {
      client.clientSince ??= weekdayOnOrBefore(addDays(this.latestActDate, -random.int(0, 120)));
    }
  }

  private captionOf(planned: PlannedCase, clientName: string): string {
    const random = this.random;
    if (planned.jurisdiction === 'CRIMINAL') {
      const short = LEGAL_QUALIFICATIONS.find((q) => q.name === planned.offenses[0].qualification)!.short.toLowerCase();
      if (planned.proceduralRole === 'QUERELLANTE_PARTICULAR') {
        const accused = `${random.pick(CLIENT_LAST_NAMES)}, ${random.pick(CLIENT_FIRST_NAMES)}`;
        return `${accused} p.s.a. ${short} (querellante: ${clientName})`;
      }
      return `${clientName} p.s.a. ${short}`;
    }
    if (planned.jurisdiction === 'ADMINISTRATIVE') {
      return planned.proceduralRole === 'RECURRENTE'
        ? `${clientName} c/ ${planned.counterparty} · Plena jurisdicción`
        : `${clientName} · Sumario administrativo`;
    }
    return `${clientName} c/ ${planned.counterparty} · Amparo`;
  }
}

// ─── Checks before writing ───────────────────────────────────────────────────

/**
 * The rules the app enforces when it registers the same data. A failure here
 * is a bug of the planner, so it stops the seed before writing anything.
 */
function checkPlan(cases: PlannedCase[], latestActDate: Date): void {
  const problems: string[] = [];
  cases.forEach((c, index) => {
    const where = `case #${index} (${c.caption})`;
    c.acts.forEach((act, i) => {
      if (act.actDate > latestActDate) problems.push(`${where}: act ${i} dated after ${isoOf(latestActDate)}.`);
      if (i > 0 && act.actDate < c.acts[i - 1].actDate) problems.push(`${where}: act ${i} is older than the one before.`);
      if (act.notificationDate && (act.notificationDate < act.actDate || act.notificationDate > latestActDate)) {
        problems.push(`${where}: act ${i} has its notification out of range.`);
      }
      if (act.manualDueDate && act.manualDueDate < act.countsFrom) problems.push(`${where}: act ${i} manual due date before its term starts.`);
      if (c.jurisdiction === 'ADMINISTRATIVE' && act.timeLimitDays > 0 && !act.notificationDate) {
        problems.push(`${where}: act ${i} opens a term without a notification (RN6).`);
      }
    });
    if (c.startDate && c.acts.length > 0 && c.startDate > c.acts[0].actDate) problems.push(`${where}: starts after its first act.`);
    c.offenses.forEach((o) => {
      if (c.startDate && o.offenseDate > c.startDate) problems.push(`${where}: offense after the start of the case.`);
    });
    if (c.declaration && c.acts.length > 0 && c.declaration.date < c.acts[c.acts.length - 1].actDate) {
      problems.push(`${where}: declared prescribed before its last act.`);
    }
    // Since D-113 an act after the expiry no longer restarts the term: an
    // "interrupted" case whose acts all came too late would show nothing.
    if (c.profile === 'interrupted') {
      const actDates = c.interruptiveActs.map((act) => act.actDate);
      if (!c.offenses.some((o) => prescriptionStartsOn(o, actDates, null).getTime() !== o.offenseDate.getTime())) {
        problems.push(`${where}: no interruptive act restarts the term of an offense (D-113).`);
      }
    }
  });
  if (problems.length > 0) {
    throw new Error(`The presentation fixture is inconsistent:\n  ${problems.join('\n  ')}`);
  }
}

// ─── Writing ─────────────────────────────────────────────────────────────────

/** Fixed: the same fixture on every load into an empty database. */
const FIXTURE_SEED = 20261111;

export async function seedPresentationCases(prisma: PrismaClient): Promise<void> {
  const presentationDay = civilDate(process.env.SEED_PRESENTATION_DATE ?? '2026-11-11');
  const latestActDate = weekdayOnOrBefore(addDays(presentationDay, -3));

  // Not idempotent case by case: the fixture is planned as a whole, so it is
  // loaded only into a database without cases.
  if ((await prisma.case.count()) > 0) {
    console.log('Presentation cases: the database already has cases, skipped. Recreate it to load them again.');
    return;
  }

  const qualificationIds = new Map<string, number>();
  for (const qualification of LEGAL_QUALIFICATIONS) {
    const data = { name: qualification.name, prescriptionMonths: qualification.prescriptionMonths };
    const existing = await prisma.legalQualification.findFirst({
      where: { name: { equals: qualification.name, mode: 'insensitive' }, active: true },
    });
    const row = existing
      ? await prisma.legalQualification.update({ where: { id: existing.id }, data })
      : await prisma.legalQualification.create({ data });
    qualificationIds.set(qualification.name, row.id);
  }

  const lawyers = DEV_USERS.filter((u) => u.registrationNumber !== undefined);
  const responsibles: { lawyerId: number; userId: number }[] = [];
  for (const devUser of lawyers) {
    const lawyer = await prisma.lawyer.findUniqueOrThrow({ where: { registrationNumber: devUser.registrationNumber } });
    const user = await prisma.user.findUniqueOrThrow({ where: { username: devUser.username } });
    responsibles.push({ lawyerId: lawyer.id, userId: user.id });
  }
  const secretary = await prisma.user.findUniqueOrThrow({ where: { username: 'secretaria' } });

  const planner = new CasePlanner(FIXTURE_SEED, presentationDay, latestActDate);
  const clients = planner.planClients(100);
  const cases = planner.planCases(responsibles.length, clients);
  checkPlan(cases, latestActDate);

  const clientIds: number[] = [];
  for (const client of clients) {
    const existing = await prisma.client.findFirst({
      where: { documentType: client.documentType, documentNumber: client.documentNumber, active: true },
    });
    const row = existing ?? (await prisma.client.create({ data: { ...client, clientSince: client.clientSince! } }));
    clientIds.push(row.id);
  }

  const jurisdictions = new Map<string, number>();
  const stateIds = new Map<string, number>();
  for (const row of await prisma.jurisdiction.findMany()) jurisdictions.set(row.name, row.jurisdictionId);
  for (const row of await prisma.proceduralState.findMany({ where: { isActive: true }, include: { jurisdiction: true } })) {
    stateIds.set(`${row.jurisdiction.name}:${row.name}`, row.stateId);
  }
  const stateId = (jurisdiction: string, name: string): number => {
    const id = stateIds.get(`${jurisdiction}:${name}`);
    if (id === undefined) throw new Error(`State "${name}" of ${jurisdiction} is not in the database.`);
    return id;
  };

  for (const planned of cases) {
    const { lawyerId, userId } = responsibles[planned.lawyerIndex];
    await prisma.$transaction(async (tx) => {
      const isAmparo = planned.jurisdiction === 'AMPARO';
      const created = await tx.case.create({
        data: {
          sacNumber: planned.sacNumber,
          caption: planned.caption,
          court: planned.court,
          jurisdictionId: jurisdictions.get(planned.jurisdiction)!,
          proceduralRole: planned.proceduralRole,
          instructorName: planned.instructorName,
          instructorPhone: planned.instructorPhone,
          instructorExtension: planned.instructorExtension,
          counterparty: planned.counterparty,
          subjectMatter: planned.subjectMatter,
          clientId: clientIds[planned.clientIndex],
          responsibleLawyerId: lawyerId,
          startDate: planned.startDate,
          // Data of each jurisdiction (D-67): `NULL` outside its own, as the app stores it.
          clientDetained: planned.clientDetained,
          injunctionGranted: planned.injunctionGranted,
          harmfulActDate: planned.harmfulAct?.date ?? null,
          harmfulActRenews: isAmparo ? planned.harmfulAct?.renewalDays != null : null,
          harmfulActRenewalDays: planned.harmfulAct?.renewalDays ?? null,
          harmfulActTermDays: planned.harmfulAct ? 15 : null,
          harmfulActTermDayType: planned.harmfulAct ? 'BUSINESS' : null,
          administrativeRemedyExhaustedOn: planned.administrativeRemedyExhaustedOn,
          courtFeePaid: planned.courtFeePaid,
          // A case is born in the initial state; its acts take it out.
          currentStateId: stateId(planned.jurisdiction, INITIAL_STATE_NAME),
          createdByUserId: planned.createdBySecretary ? secretary.id : userId,
          createdAt: planned.createdAt,
        },
      });

      // Each offense counts from the interruptive acts that restarted it (RN8,
      // D-113). A case declared prescribed has every offense declared (D-113),
      // as the app leaves it with "Marcar toda la causa prescripta".
      const actDates = planned.interruptiveActs.map((act) => act.actDate);
      const declaration = planned.declaration;
      for (const offense of planned.offenses) {
        const startsOn = prescriptionStartsOn(offense, actDates, declaration?.date ?? null);
        await tx.offense.create({
          data: {
            caseId: created.id,
            legalQualificationId: qualificationIds.get(offense.qualification)!,
            offenseDate: offense.offenseDate,
            prescriptionDate: addMonths(startsOn, offense.prescriptionMonths),
            ...(declaration && {
              prescriptionDeclaredOn: declaration.date,
              prescriptionResolution: declaration.resolution,
              prescriptionGrounds: declaration.grounds,
              prescriptionRegisteredByUserId: userId,
              prescriptionRegisteredAt: atHour(declaration.date, 16),
            }),
          },
        });
      }

      let currentActId: number | null = null;
      for (const act of planned.acts) {
        const saved = await tx.proceduralAct.create({
          data: {
            caseId: created.id,
            proceduralStateId: act.stateName === null ? null : stateId(planned.jurisdiction, act.stateName),
            customState: act.customState,
            actDate: act.actDate,
            notificationDate: act.notificationDate,
            notes: act.notes,
            isInterruptive: act.interruptive,
            deadlineTimeLimitDays: act.timeLimitDays,
            deadlineDayType: act.dayType,
            deadlineCountsFrom: act.countsFrom,
            deadlineComputedDueDate: act.computedDueDate,
            deadlineManualDueDate: act.manualDueDate,
            registeredByUserId: userId,
            registeredByLawyerId: lawyerId,
            registeredAt: atHour(act.actDate, 17),
          },
        });
        currentActId = saved.id;
      }

      for (const interruptive of planned.interruptiveActs) {
        await tx.interruptiveAct.create({
          data: {
            caseId: created.id,
            name: interruptive.name,
            actDate: interruptive.actDate,
            registeredByUserId: userId,
            registeredByLawyerId: lawyerId,
            registeredAt: atHour(interruptive.actDate, 18),
          },
        });
      }

      // Acts are in date order, so the last one is the current act (CA-26.10).
      const last = planned.acts[planned.acts.length - 1];
      if (planned.declaration) {
        // "Prescripta" is reached without an act (D-54): no current act, no open term.
        await tx.case.update({
          where: { id: created.id },
          data: {
            currentStateId: stateId('CRIMINAL', PRESCRIBED_STATE_NAME),
            currentProceduralActId: null,
            prescriptionDate: planned.declaration.date,
            prescriptionResolution: planned.declaration.resolution,
            prescriptionGrounds: planned.declaration.grounds,
            prescriptionRegisteredByUserId: userId,
            prescriptionRegisteredAt: atHour(planned.declaration.date, 16),
          },
        });
      } else if (last) {
        await tx.case.update({
          where: { id: created.id },
          data: {
            currentStateId: last.stateName === null ? null : stateId(planned.jurisdiction, last.stateName),
            currentCustomState: last.customState,
            currentProceduralActId: currentActId,
          },
        });
      }
    });
  }

  logSummary(cases, clients.length, presentationDay, latestActDate);
}

/** What each lawyer got, counted as the screens will show it on the presentation day. */
function logSummary(cases: PlannedCase[], clientCount: number, presentationDay: Date, latestActDate: Date): void {
  console.log(
    `Presentation cases: ${cases.length} cases, ${clientCount} clients, ${LEGAL_QUALIFICATIONS.length} legal qualifications. ` +
      `Dated for ${isoOf(presentationDay)}; no act after ${isoOf(latestActDate)}.`,
  );
  const lawyers = DEV_USERS.filter((u) => u.registrationNumber !== undefined);
  lawyers.forEach((lawyer, index) => {
    const own = cases.filter((c) => c.lawyerIndex === index);
    const count = (predicate: (c: PlannedCase) => boolean) => own.filter(predicate).length;
    const dueIn = (c: PlannedCase): number | null => {
      if (c.ending.kind === 'due') return c.ending.days;
      if (c.ending.kind === 'custom' && c.ending.days !== undefined) return c.ending.days;
      return null;
    };
    const active = count((c) => c.ending.kind !== 'closed' && c.ending.kind !== 'prescribed');
    console.log(
      `  ${lawyer.username.padEnd(18)} active ${active}: ` +
        `overdue ${count((c) => (dueIn(c) ?? 0) < 0)}, today ${count((c) => dueIn(c) === 0)}, ` +
        `next 5 days ${count((c) => { const d = dueIn(c); return d !== null && d >= 1 && d <= 5; })}, ` +
        `later ${count((c) => (dueIn(c) ?? 0) > 5)}, no term ${count((c) => c.ending.kind === 'noTerm' || (c.ending.kind === 'custom' && c.ending.days === undefined))}, ` +
        `initial ${count((c) => c.ending.kind === 'initial')} · closed ${count((c) => c.ending.kind === 'closed')}, ` +
        `prescribed ${count((c) => c.ending.kind === 'prescribed')} · ` +
        `prescription alert ${count((c) => c.profile === 'alert')}, expired ${count((c) => c.profile === 'expired')}, ` +
        `interrupted ${count((c) => c.interruptiveActs.length > 0)}`,
    );
  });
}
