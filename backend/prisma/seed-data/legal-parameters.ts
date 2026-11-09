/**
 * Procedural states and legal qualifications for the presentation fixture.
 *
 * The firm supplies the definitive tables (RN4, RN5) and loads them through
 * the API; these are sample data, drawn from the procedural law of Córdoba so
 * that they read as real:
 *
 *   - CRIMINAL: Código Procesal Penal de Córdoba, Ley 8123. Terms in business
 *     days (art. 180).
 *   - ADMINISTRATIVE: Ley de Procedimiento Administrativo 5350 (t.o. Ley 6658)
 *     for the administrative stage, Ley 7182 for the judicial one.
 *   - AMPARO: Ley 4915. Its terms in hours are converted to business days
 *     (48 h = 2 days, 24 h = 1 day).
 *
 * The article each term comes from is noted next to it. A state's term is the
 * one that the act moving the case there opens for the lawyer: the time to
 * answer, oppose or appeal.
 *
 * Rules the database enforces: `timeLimitDays = 0` ⇔ `dayType = NONE`, the
 * initial state is non-terminal with no term, "Prescripta" is terminal with no
 * term and exists only in CRIMINAL. A terminal state opens no term either: it
 * closes the case (D-69). States have no order (D-31); the order in which a
 * case goes through them lives in `LIFECYCLES`, and only in this fixture.
 *
 * The `name` values stay in Spanish: they are legal terminology the firm reads
 * verbatim, not developer-facing strings.
 */

export type JurisdictionCode = 'CRIMINAL' | 'ADMINISTRATIVE' | 'AMPARO';

export interface StateSeed {
  jurisdiction: JurisdictionCode;
  name: string;
  timeLimitDays: number;
  dayType: 'NONE' | 'BUSINESS' | 'CONSECUTIVE';
  terminal: boolean;
  isInitial?: boolean;
  isPrescribed?: boolean;
}

export const INITIAL_STATE_NAME = 'Iniciada';
export const PRESCRIBED_STATE_NAME = 'Prescripta';

/** `[name, business days]`: 0 opens no term. */
type Row = readonly [string, number];

const open = (jurisdiction: JurisdictionCode, rows: readonly Row[]): StateSeed[] =>
  rows.map(([name, days]) => ({
    jurisdiction,
    name,
    timeLimitDays: days,
    dayType: days > 0 ? 'BUSINESS' : 'NONE',
    terminal: false,
  }));

const closing = (jurisdiction: JurisdictionCode, names: readonly string[]): StateSeed[] =>
  names.map((name) => ({ jurisdiction, name, timeLimitDays: 0, dayType: 'NONE', terminal: true }));

const initial = (jurisdiction: JurisdictionCode): StateSeed => ({
  jurisdiction,
  name: INITIAL_STATE_NAME,
  timeLimitDays: 0,
  dayType: 'NONE',
  terminal: false,
  isInitial: true,
});

export const PROCEDURAL_STATES: readonly StateSeed[] = [
  // ── Criminal ─────────────────────────────────────────────────────────────
  initial('CRIMINAL'),
  {
    jurisdiction: 'CRIMINAL',
    name: PRESCRIBED_STATE_NAME,
    timeLimitDays: 0,
    dayType: 'NONE',
    terminal: true,
    isPrescribed: true,
  },
  ...open('CRIMINAL', [
    ['Designación de abogado defensor', 3],
    // Art. 336: the prosecutor has 5 days from the statement to ask for pretrial detention.
    ['Declaración del imputado', 5],
    // Art. 338: opposition to a decision of the prosecutor, within 3 days.
    ['Prisión preventiva', 3],
    // Art. 335: going to the judge against the rejected evidence, within 3 days.
    ['Rechazo de diligencias propuestas por la defensa', 3],
    // Art. 461: appeal within 3 days.
    ['Resolución del Juzgado de Control', 3],
    // Art. 357: the defence may oppose within 5 days of notice.
    ['Requerimiento de citación a juicio', 5],
    // Art. 358: the judge decides the opposition within 5 days.
    ['Oposición al requerimiento de citación a juicio', 5],
    // Art. 361: 3 common days to appear, examine the file and challenge judges.
    ['Citación a juicio', 3],
    // Art. 363: 10 common days to offer evidence.
    ['Emplazamiento para ofrecer prueba', 10],
    ['Fijación de audiencia de debate', 0],
    ['Debate oral', 0],
    // Art. 474: cassation within 15 days of notice.
    ['Sentencia condenatoria', 15],
    ['Sentencia absolutoria', 15],
    // Arts. 352 and 461: appeal of the dismissal within 3 days.
    ['Sobreseimiento', 3],
    ['Recurso de casación interpuesto', 0],
    // Art. 486: complaint for a denied appeal within 2 days (same city).
    ['Denegatoria de recurso', 2],
    // Art. 360 bis: probation, with no term for the defence.
    ['Suspensión del juicio a prueba', 0],
  ]),
  ...closing('CRIMINAL', ['Sentencia firme', 'Sobreseimiento firme', 'Archivada']),

  // ── Administrative ───────────────────────────────────────────────────────
  initial('ADMINISTRATIVE'),
  ...open('ADMINISTRATIVE', [
    ['Notificación de imputación en sumario', 10],
    ['Presentación de descargo', 0],
    ['Apertura a prueba', 20],
    ['Clausura de la prueba y vista para alegar', 5],
    // Ley 5350, art. 80: reconsideration within 10 days.
    ['Resolución sancionatoria', 10],
    ['Recurso de reconsideración interpuesto', 0],
    // Hierarchical appeal within 10 days of the rejection.
    ['Rechazo del recurso de reconsideración', 10],
    ['Recurso jerárquico interpuesto', 0],
    // Ley 7182, art. 8: the claim before the court within 30 days.
    ['Resolución que agota la vía administrativa', 30],
    ['Demanda contencioso-administrativa interpuesta', 0],
    ['Contestación de la demanda', 0],
    ['Sentencia de la Cámara Contencioso Administrativa', 15],
  ]),
  ...closing('ADMINISTRATIVE', ['Sobreseimiento administrativo', 'Sanción firme', 'Sentencia firme', 'Archivada']),

  // ── Amparo ───────────────────────────────────────────────────────────────
  initial('AMPARO'),
  ...open('AMPARO', [
    ['Interposición de la acción', 0],
    // Art. 15: the injunction is appealable within 48 hours.
    ['Medida de no innovar dictada', 2],
    // Art. 8: the report may not take more than 3 days.
    ['Pedido de informe', 3],
    // Art. 11: judgment within the third day of the report.
    ['Contestación del informe', 3],
    // Art. 9: the hearing within the third day.
    ['Fijación de audiencia de prueba', 3],
    ['Audiencia de prueba', 3],
    // Art. 15: appeal within 48 hours of notice.
    ['Sentencia de primera instancia', 2],
    // Art. 15: the judge grants or denies the appeal within 48 hours.
    ['Recurso de apelación interpuesto', 2],
    // Art. 15: direct appeal within 24 hours of the denial.
    ['Denegatoria de la apelación', 1],
    ['Elevación a la Cámara', 0],
    // Art. 17 refers to the Code of Civil Procedure: cassation within 15 days.
    ['Sentencia de Cámara', 15],
  ]),
  ...closing('AMPARO', ['Sentencia firme', 'Archivada']),
];

/**
 * How a case goes through the states of its jurisdiction, oldest act first.
 * A `?` marks a step a case may skip. The fixture cuts a lifecycle at the
 * state it wants the case to end in, so a case midway through a long one has
 * the acts that lead there and no others.
 */
export const LIFECYCLES: Record<JurisdictionCode, readonly (readonly string[])[]> = {
  CRIMINAL: [
    [
      'Designación de abogado defensor',
      'Declaración del imputado',
      '?Prisión preventiva',
      '?Rechazo de diligencias propuestas por la defensa',
      '?Resolución del Juzgado de Control',
      'Requerimiento de citación a juicio',
      '?Oposición al requerimiento de citación a juicio',
      'Citación a juicio',
      'Emplazamiento para ofrecer prueba',
      'Fijación de audiencia de debate',
      'Debate oral',
      'Sentencia condenatoria',
      'Recurso de casación interpuesto',
      'Sentencia firme',
    ],
    [
      'Designación de abogado defensor',
      'Declaración del imputado',
      'Requerimiento de citación a juicio',
      'Citación a juicio',
      'Emplazamiento para ofrecer prueba',
      'Fijación de audiencia de debate',
      'Debate oral',
      'Sentencia absolutoria',
      'Sentencia firme',
    ],
    [
      'Designación de abogado defensor',
      'Declaración del imputado',
      '?Rechazo de diligencias propuestas por la defensa',
      '?Resolución del Juzgado de Control',
      'Sobreseimiento',
      'Sobreseimiento firme',
    ],
    [
      'Designación de abogado defensor',
      'Declaración del imputado',
      'Requerimiento de citación a juicio',
      'Citación a juicio',
      'Emplazamiento para ofrecer prueba',
      'Suspensión del juicio a prueba',
    ],
    [
      'Designación de abogado defensor',
      'Declaración del imputado',
      '?Prisión preventiva',
      'Requerimiento de citación a juicio',
      'Citación a juicio',
      'Emplazamiento para ofrecer prueba',
      'Debate oral',
      'Sentencia condenatoria',
      'Recurso de casación interpuesto',
      'Denegatoria de recurso',
    ],
    ['Designación de abogado defensor', 'Declaración del imputado', 'Archivada'],
  ],
  ADMINISTRATIVE: [
    [
      'Notificación de imputación en sumario',
      'Presentación de descargo',
      'Apertura a prueba',
      'Clausura de la prueba y vista para alegar',
      'Resolución sancionatoria',
      'Recurso de reconsideración interpuesto',
      'Rechazo del recurso de reconsideración',
      'Recurso jerárquico interpuesto',
      'Resolución que agota la vía administrativa',
      'Demanda contencioso-administrativa interpuesta',
      'Contestación de la demanda',
      'Sentencia de la Cámara Contencioso Administrativa',
      'Sentencia firme',
    ],
    [
      'Notificación de imputación en sumario',
      'Presentación de descargo',
      '?Apertura a prueba',
      'Clausura de la prueba y vista para alegar',
      'Sobreseimiento administrativo',
    ],
    [
      'Notificación de imputación en sumario',
      'Presentación de descargo',
      'Apertura a prueba',
      'Clausura de la prueba y vista para alegar',
      'Resolución sancionatoria',
      'Sanción firme',
    ],
    [
      'Resolución sancionatoria',
      'Recurso de reconsideración interpuesto',
      'Rechazo del recurso de reconsideración',
      'Recurso jerárquico interpuesto',
      'Resolución que agota la vía administrativa',
      'Demanda contencioso-administrativa interpuesta',
      'Contestación de la demanda',
      'Sentencia de la Cámara Contencioso Administrativa',
    ],
    ['Notificación de imputación en sumario', 'Presentación de descargo', 'Archivada'],
  ],
  AMPARO: [
    [
      'Interposición de la acción',
      '?Medida de no innovar dictada',
      'Pedido de informe',
      'Contestación del informe',
      '?Fijación de audiencia de prueba',
      '?Audiencia de prueba',
      'Sentencia de primera instancia',
      'Recurso de apelación interpuesto',
      'Elevación a la Cámara',
      'Sentencia de Cámara',
      'Sentencia firme',
    ],
    [
      'Interposición de la acción',
      'Medida de no innovar dictada',
      'Pedido de informe',
      'Contestación del informe',
      'Sentencia de primera instancia',
      'Sentencia firme',
    ],
    [
      'Interposición de la acción',
      'Pedido de informe',
      'Contestación del informe',
      'Sentencia de primera instancia',
      'Recurso de apelación interpuesto',
      'Denegatoria de la apelación',
    ],
    ['Interposición de la acción', 'Pedido de informe', 'Archivada'],
  ],
};

/**
 * Hand-written states (CA-26.7): real procedural steps that are too rare for
 * the firm to put in its table. They open no term; a lawyer who needs one
 * enters the due date by hand. None may repeat a name of the table.
 */
export const CUSTOM_STATES: Record<JurisdictionCode, readonly string[]> = {
  CRIMINAL: [
    'Juicio abreviado inicial solicitado',
    'Investigación suplementaria ordenada',
    'Excepción de falta de acción planteada',
    'Recusación del tribunal planteada',
    'Criterio de oportunidad solicitado',
    'Sorteo de jurados populares',
  ],
  ADMINISTRATIVE: [
    'Pedido de pronto despacho',
    'Vista de las actuaciones solicitada',
    'Suspensión del acto solicitada',
    'Amparo por mora interpuesto',
  ],
  AMPARO: [
    'Cuestión abstracta por cese del acto lesivo',
    'Intimación por incumplimiento de la cautelar',
    'Pedido de astreintes',
    'Incidente de nulidad planteado',
  ],
};

/**
 * The acts that interrupt the prescription (art. 67 CP), with the procedural
 * state they come with: the fixture registers each one on the date of the act
 * that leads to that state.
 */
export const INTERRUPTIVE_ACTS: readonly { name: string; withState: string }[] = [
  { name: 'Primer llamado a prestar declaración indagatoria', withState: 'Declaración del imputado' },
  { name: 'Requerimiento acusatorio de elevación a juicio', withState: 'Requerimiento de citación a juicio' },
  { name: 'Auto de citación a juicio', withState: 'Citación a juicio' },
  { name: 'Sentencia condenatoria no firme', withState: 'Sentencia condenatoria' },
];

/**
 * Legal qualifications of the Código Penal and its complementary laws.
 *
 * `prescriptionMonths` follows art. 62 CP: the maximum of the penalty, never
 * more than 12 years nor less than 2; 15 years for life imprisonment (inc. 1).
 * `short` is how the caption names the offense.
 */
export const LEGAL_QUALIFICATIONS: readonly { name: string; short: string; prescriptionMonths: number }[] = [
  // Against life and bodily integrity
  { name: 'Homicidio simple — art. 79 CP', short: 'Homicidio simple', prescriptionMonths: 144 },
  { name: 'Homicidio calificado — art. 80 CP', short: 'Homicidio calificado', prescriptionMonths: 180 },
  { name: 'Homicidio en estado de emoción violenta — art. 81 inc. 1 a) CP', short: 'Homicidio en estado de emoción violenta', prescriptionMonths: 72 },
  { name: 'Homicidio culposo — art. 84 CP', short: 'Homicidio culposo', prescriptionMonths: 60 },
  { name: 'Homicidio culposo por conducción de vehículo — art. 84 bis CP', short: 'Homicidio culposo', prescriptionMonths: 60 },
  { name: 'Lesiones leves — art. 89 CP', short: 'Lesiones leves', prescriptionMonths: 24 },
  { name: 'Lesiones leves calificadas — arts. 89 y 92 CP', short: 'Lesiones leves calificadas', prescriptionMonths: 24 },
  { name: 'Lesiones graves — art. 90 CP', short: 'Lesiones graves', prescriptionMonths: 72 },
  { name: 'Lesiones gravísimas — art. 91 CP', short: 'Lesiones gravísimas', prescriptionMonths: 120 },
  { name: 'Lesiones culposas — art. 94 CP', short: 'Lesiones culposas', prescriptionMonths: 36 },
  { name: 'Abuso de armas — art. 104 CP', short: 'Abuso de armas', prescriptionMonths: 36 },
  { name: 'Abandono de persona — art. 106 CP', short: 'Abandono de persona', prescriptionMonths: 72 },
  // Against sexual integrity
  { name: 'Abuso sexual simple — art. 119 primer párrafo CP', short: 'Abuso sexual', prescriptionMonths: 48 },
  { name: 'Abuso sexual con acceso carnal — art. 119 tercer párrafo CP', short: 'Abuso sexual con acceso carnal', prescriptionMonths: 144 },
  // Against freedom
  { name: 'Privación ilegítima de la libertad — art. 141 CP', short: 'Privación ilegítima de la libertad', prescriptionMonths: 36 },
  { name: 'Amenazas simples — art. 149 bis primer párrafo CP', short: 'Amenazas', prescriptionMonths: 24 },
  { name: 'Amenazas calificadas por el uso de armas — art. 149 bis CP', short: 'Amenazas calificadas', prescriptionMonths: 36 },
  { name: 'Coacción — art. 149 bis segundo párrafo CP', short: 'Coacción', prescriptionMonths: 48 },
  { name: 'Violación de domicilio — art. 150 CP', short: 'Violación de domicilio', prescriptionMonths: 24 },
  // Against property
  { name: 'Hurto simple — art. 162 CP', short: 'Hurto', prescriptionMonths: 24 },
  { name: 'Hurto calificado — art. 163 CP', short: 'Hurto calificado', prescriptionMonths: 72 },
  { name: 'Robo simple — art. 164 CP', short: 'Robo', prescriptionMonths: 72 },
  { name: 'Robo con armas — art. 166 inc. 2 CP', short: 'Robo con armas', prescriptionMonths: 144 },
  { name: 'Robo calificado en poblado y en banda — art. 167 inc. 2 CP', short: 'Robo calificado', prescriptionMonths: 120 },
  { name: 'Extorsión — art. 168 CP', short: 'Extorsión', prescriptionMonths: 120 },
  { name: 'Secuestro extorsivo — art. 170 CP', short: 'Secuestro extorsivo', prescriptionMonths: 144 },
  { name: 'Estafa — art. 172 CP', short: 'Estafa', prescriptionMonths: 72 },
  { name: 'Defraudación por retención indebida — art. 173 inc. 2 CP', short: 'Retención indebida', prescriptionMonths: 72 },
  { name: 'Administración fraudulenta — art. 173 inc. 7 CP', short: 'Administración fraudulenta', prescriptionMonths: 72 },
  { name: 'Usurpación — art. 181 CP', short: 'Usurpación', prescriptionMonths: 36 },
  { name: 'Daño — art. 183 CP', short: 'Daño', prescriptionMonths: 24 },
  // Against public safety and order
  { name: 'Tenencia ilegal de arma de fuego de uso civil — art. 189 bis inc. 2 CP', short: 'Tenencia ilegal de arma de fuego', prescriptionMonths: 24 },
  { name: 'Portación ilegal de arma de fuego de uso civil — art. 189 bis inc. 2 CP', short: 'Portación ilegal de arma de fuego', prescriptionMonths: 48 },
  { name: 'Conducción peligrosa — art. 193 bis CP', short: 'Conducción peligrosa', prescriptionMonths: 36 },
  // Against the public administration
  { name: 'Atentado contra la autoridad — art. 237 CP', short: 'Atentado contra la autoridad', prescriptionMonths: 24 },
  { name: 'Resistencia o desobediencia a la autoridad — art. 239 CP', short: 'Resistencia a la autoridad', prescriptionMonths: 24 },
  { name: 'Incumplimiento de los deberes de funcionario público — art. 248 CP', short: 'Incumplimiento de deberes de funcionario público', prescriptionMonths: 24 },
  { name: 'Cohecho pasivo — art. 256 CP', short: 'Cohecho', prescriptionMonths: 72 },
  { name: 'Peculado — art. 261 CP', short: 'Peculado', prescriptionMonths: 120 },
  { name: 'Falso testimonio — art. 275 CP', short: 'Falso testimonio', prescriptionMonths: 48 },
  { name: 'Encubrimiento — art. 277 CP', short: 'Encubrimiento', prescriptionMonths: 36 },
  { name: 'Encubrimiento agravado — art. 277 inc. 3 CP', short: 'Encubrimiento agravado', prescriptionMonths: 72 },
  // Against public faith and the economic order
  { name: 'Falsificación de documento público — art. 292 CP', short: 'Falsificación de documento', prescriptionMonths: 72 },
  { name: 'Uso de documento falso — art. 296 CP', short: 'Uso de documento falso', prescriptionMonths: 72 },
  { name: 'Lavado de activos — art. 303 CP', short: 'Lavado de activos', prescriptionMonths: 120 },
  // Complementary laws
  { name: 'Comercialización de estupefacientes — art. 5 inc. c Ley 23.737', short: 'Comercialización de estupefacientes', prescriptionMonths: 144 },
  { name: 'Tenencia simple de estupefacientes — art. 14 primer párrafo Ley 23.737', short: 'Tenencia de estupefacientes', prescriptionMonths: 72 },
  { name: 'Tenencia de estupefacientes para consumo personal — art. 14 segundo párrafo Ley 23.737', short: 'Tenencia para consumo', prescriptionMonths: 24 },
  { name: 'Incumplimiento de los deberes de asistencia familiar — art. 1 Ley 13.944', short: 'Incumplimiento de deberes de asistencia familiar', prescriptionMonths: 24 },
  { name: 'Evasión simple — art. 1 Régimen Penal Tributario, Ley 27.430', short: 'Evasión tributaria', prescriptionMonths: 72 },
];
