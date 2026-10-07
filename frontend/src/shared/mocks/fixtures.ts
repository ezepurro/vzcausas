/**
 * Datos semilla del mock.
 *
 * Son constantes de sólo lectura: el servidor falso trabaja sobre una copia
 * (ver `db.ts`), así que se pueden importar desde un test o una pantalla sin
 * miedo a que alguien las haya mutado antes.
 *
 * Los datos salen del prototipo (`docs/prototypes/`): los mismos nombres,
 * las mismas matrículas y el mismo ciclo de vida de cada fuero. Así lo que se
 * ve desarrollando es lo que el estudio aprobó.
 *
 * El volumen está elegido para que la paginación se pueda probar: con el
 * `limit` por defecto de 20, los usuarios, los estados procesales, los
 * clientes y las causas dan dos páginas.
 *
 * `activeCases` no se escribe acá: el valor que devuelve la API se calcula al
 * serializar, contando las causas de la base (ver `db.ts`). Así no hay un
 * número escrito a mano que pueda quedar distinto de las causas que de verdad
 * existen. Los abogados lo llevan en `0` porque su tipo lo exige; los estados,
 * las calificaciones y los clientes directamente no lo guardan.
 */

import type {
    Client,
    Jurisdiction,
    Lawyer,
    LegalQualification,
    ProceduralRole,
    ProceduralState,
    Role,
} from './contract';

/* ------------------------------------------------------------------ */
/* Credenciales                                                        */
/* ------------------------------------------------------------------ */

/** Contraseña de todos los usuarios semilla, salvo las de `CREDENTIALS`. */
export const DEFAULT_PASSWORD = 'password1';

/**
 * Contraseñas por usuario. Lo que no esté acá usa `DEFAULT_PASSWORD`.
 *
 * Todas cumplen el requisito del contrato: 8 caracteres o más, con al menos
 * un número.
 */
export const CREDENTIALS: Record<string, string> = {
    fvazquez: 'password1',
    mrios: 'abogado123',
    gestion: 'secre123',
};

/** Segundos de vigencia del token, como en el ejemplo del contrato. */
export const EXPIRES_IN = 3600;

/**
 * Prefijo del token falso. Se completa con el id del usuario y un contador
 * para que dos logins no devuelvan el mismo string.
 */
export const TOKEN_PREFIX = 'eyJhbGciOi';

/* ------------------------------------------------------------------ */
/* Abogados                                                            */
/* ------------------------------------------------------------------ */

/**
 * Los siete profesionales del estudio, tal como están en el prototipo.
 *
 * La matrícula usa el formato real de Córdoba: circunscripción, guión y
 * número (`1-28114`).
 *
 * `activeCases` va en `0` acá y se calcula al serializar (ver el encabezado).
 *
 * Un abogado tiene a lo sumo **una** cuenta activa (`LAWYER_ALREADY_LINKED`
 * en el backend). Por eso cada usuario que ejerce tiene su propia ficha, y
 * las dos últimas quedan **sin cuenta**: son las que se pueden vincular en
 * un alta sin chocar con esa regla. Esas dos tampoco tienen causas, así que
 * son las únicas que se pueden dar de baja.
 */
export const LAWYERS: readonly Lawyer[] = [
    { id: 1, fullName: 'Dr. Fernando G. Vázquez', registrationNumber: '1-28114', activeCases: 0, active: true },
    { id: 2, fullName: 'Dr. Oscar Zárate', registrationNumber: '1-28109', activeCases: 0, active: true },
    { id: 3, fullName: 'Dra. Malena Ríos', registrationNumber: '1-36842', activeCases: 0, active: true },
    { id: 4, fullName: 'Dr. Ignacio Peralta', registrationNumber: '1-35207', activeCases: 0, active: true },
    { id: 5, fullName: 'Dra. Carolina Bustos', registrationNumber: '1-39510', activeCases: 0, active: true },
    { id: 6, fullName: 'Dr. Matías Ferreyra', registrationNumber: '1-38226', activeCases: 0, active: true },
    { id: 7, fullName: 'Dra. Lucía Ortega', registrationNumber: '1-41033', activeCases: 0, active: true },
    { id: 8, fullName: 'Dra. Sofía Ledesma', registrationNumber: '1-42517', activeCases: 0, active: true },
    // Sin cuenta de usuario: libres para vincular en un alta.
    { id: 9, fullName: 'Dra. Julieta Campos', registrationNumber: '1-43890', activeCases: 0, active: true },
    { id: 10, fullName: 'Dr. Tomás Aguirre', registrationNumber: '1-44102', activeCases: 0, active: true },
];

/* ------------------------------------------------------------------ */
/* Usuarios                                                            */
/* ------------------------------------------------------------------ */

/**
 * Forma con la que la base guarda un usuario.
 *
 * Difiere del recurso `User` del contrato en dos cosas, a propósito:
 *
 * - guarda `lawyerId` y no el objeto `lawyer` embebido, que se arma al
 *   serializar (así una edición del abogado se refleja sola);
 * - la contraseña vive aparte, en `db.passwords`.
 */
export interface StoredUser {
    id: number;
    username: string;
    fullName: string;
    email: string;
    roles: Role[];
    lawyerId: number | null;
    lastLoginAt: string | null;
    active: boolean;
}

const MAIL = (user: string) => `${user}@vazquezzarate.com`;

/**
 * Los nueve usuarios del prototipo más trece de relleno, para que la
 * paginación por defecto dé dos páginas.
 *
 * Dos casos tienen más de un rol (`fvazquez` y `sledesma`) para que la UI no
 * asuma que el arreglo trae siempre un elemento solo.
 *
 * `lastLoginAt` mezcla fechas de hoy, de ayer y de hace semanas —y un `null`
 * en quien nunca entró— para que la columna "Último acceso" tenga los cuatro
 * casos que hay que saber formatear.
 */
export const USERS: readonly StoredUser[] = [
    { id: 1, username: 'fvazquez', fullName: 'Fernando G. Vázquez', email: MAIL('fvazquez'), roles: ['ADMINISTRATOR', 'LAWYER'], lawyerId: 1, lastLoginAt: '2026-09-19T08:12:00-03:00', active: true },
    { id: 2, username: 'ozarate', fullName: 'Oscar Zárate', email: MAIL('ozarate'), roles: ['ADMINISTRATOR', 'LAWYER'], lawyerId: 2, lastLoginAt: '2026-09-19T09:40:00-03:00', active: true },
    { id: 3, username: 'mrios', fullName: 'Malena Ríos', email: MAIL('mrios'), roles: ['LAWYER'], lawyerId: 3, lastLoginAt: '2026-09-19T08:55:00-03:00', active: true },
    { id: 4, username: 'iperalta', fullName: 'Ignacio Peralta', email: MAIL('iperalta'), roles: ['LAWYER'], lawyerId: 4, lastLoginAt: '2026-09-18T18:20:00-03:00', active: true },
    { id: 5, username: 'cbustos', fullName: 'Carolina Bustos', email: MAIL('cbustos'), roles: ['LAWYER'], lawyerId: 5, lastLoginAt: '2026-09-19T10:02:00-03:00', active: true },
    { id: 6, username: 'mferreyra', fullName: 'Matías Ferreyra', email: MAIL('mferreyra'), roles: ['LAWYER'], lawyerId: 6, lastLoginAt: '2026-09-08T11:30:00-03:00', active: true },
    { id: 7, username: 'lortega', fullName: 'Lucía Ortega', email: MAIL('lortega'), roles: ['LAWYER'], lawyerId: 7, lastLoginAt: '2026-09-19T11:15:00-03:00', active: true },
    { id: 8, username: 'gestion', fullName: 'Gestión Estudio', email: MAIL('gestion'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: '2026-09-19T07:58:00-03:00', active: true },
    { id: 9, username: 'ravila', fullName: 'Romina Ávila', email: MAIL('ravila'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: '2026-08-22T16:45:00-03:00', active: true },
    // Relleno: secretaría y mesa de entradas, para llegar a dos páginas.
    { id: 10, username: 'sledesma', fullName: 'Sofía Ledesma', email: MAIL('sledesma'), roles: ['SECRETARY', 'LAWYER'], lawyerId: 8, lastLoginAt: '2026-09-17T09:10:00-03:00', active: true },
    { id: 11, username: 'rmoyano', fullName: 'Rocío Moyano', email: MAIL('rmoyano'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: '2026-09-16T14:22:00-03:00', active: true },
    { id: 12, username: 'gsalinas', fullName: 'Gabriel Salinas', email: MAIL('gsalinas'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: '2026-09-15T08:40:00-03:00', active: true },
    { id: 13, username: 'ynunez', fullName: 'Yamila Núñez', email: MAIL('ynunez'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: '2026-09-12T17:05:00-03:00', active: true },
    { id: 14, username: 'ltoledo', fullName: 'Leandro Toledo', email: MAIL('ltoledo'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: '2026-09-11T10:18:00-03:00', active: true },
    { id: 15, username: 'earroyo', fullName: 'Emilia Arroyo', email: MAIL('earroyo'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: '2026-09-10T12:33:00-03:00', active: true },
    { id: 16, username: 'mesaentrada', fullName: 'Mesa de Entradas', email: MAIL('mesaentrada'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: '2026-09-19T07:30:00-03:00', active: true },
    // Administrador que no ejerce: sin ficha. Es el caso que prueba que la
    // matrícula la pide `LAWYER` y no el rol administrativo.
    { id: 17, username: 'supervision', fullName: 'Supervisión Estudio', email: MAIL('supervision'), roles: ['ADMINISTRATOR'], lawyerId: null, lastLoginAt: '2026-09-05T19:00:00-03:00', active: true },
    { id: 18, username: 'pcabrera', fullName: 'Paula Cabrera', email: MAIL('pcabrera'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: '2026-08-29T09:55:00-03:00', active: true },
    { id: 19, username: 'fluna', fullName: 'Federico Luna', email: MAIL('fluna'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: '2026-08-14T15:12:00-03:00', active: true },
    { id: 20, username: 'cibarra', fullName: 'Camila Ibarra', email: MAIL('cibarra'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: null, active: true },
    { id: 21, username: 'nvargas', fullName: 'Nicolás Vargas', email: MAIL('nvargas'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: null, active: true },
    // Dado de baja: NO tiene que aparecer en ningún listado ni responder a un
    // `GET` por id. Está acá justamente para probar que no se filtre, y para
    // el 409 de un username que choca contra un registro que no se ve.
    { id: 22, username: 'vsosa', fullName: 'Verónica Sosa', email: MAIL('vsosa'), roles: ['SECRETARY'], lawyerId: null, lastLoginAt: '2026-06-30T10:00:00-03:00', active: false },
];

/* ------------------------------------------------------------------ */
/* Estados procesales                                                  */
/* ------------------------------------------------------------------ */

/** Cómo guarda la base un estado procesal: sin `activeCases`, que se calcula. */
export type StoredProceduralState = Omit<ProceduralState, 'activeCases'>;

/**
 * La denominación del estado inicial, el de toda causa recién registrada
 * (V3 D-34). Es un estado de sistema, uno por fuero: **no está en esta
 * tabla**, no se lista, no se modifica ni se da de baja, y ningún acto puede
 * llevar una causa a él. Su nombre queda reservado en los tres fueros.
 */
export const INITIAL_STATE_NAME = 'Iniciada';

/**
 * 24 estados repartidos en los tres fueros del estudio, tal como los muestra
 * el prototipo. Con `limit=20` dan dos páginas.
 *
 * Los nombres van en castellano y como texto libre: es el vocabulario con el
 * que el estudio los escribe en el expediente, y en un ABM los carga una
 * persona (RN4).
 *
 * No tienen posición (V3 D-31): se listan por fuero y, dentro de cada uno, en
 * el orden en que se registraron, que es el de sus ids.
 *
 * "Archivada" aparece en los tres fueros (ids 9, 17 y 24): por eso la
 * unicidad es por **nombre + fuero** y no por nombre solo.
 *
 * Los estados sin plazo llevan `timeLimitDays: 0` + `dayType: 'NONE'`, que es
 * lo que el prototipo muestra como `—`. El contrato anterior no tenía cómo
 * expresarlo y obligaba a escribir "0 días hábiles", que vence hoy.
 */
const STATE = (
    id: number,
    name: string,
    jurisdiction: Jurisdiction,
    timeLimitDays: number,
    dayType: ProceduralState['dayType'],
    terminal = false,
): StoredProceduralState => ({
    id,
    name,
    jurisdiction,
    timeLimitDays,
    dayType,
    terminal,
    active: true,
});

export const PROCEDURAL_STATES: readonly StoredProceduralState[] = [
    // ── Penal ──
    STATE(1, 'Designación de abogado defensor', 'CRIMINAL', 0, 'NONE'),
    STATE(2, 'Cédula de notificación', 'CRIMINAL', 3, 'BUSINESS'),
    STATE(3, 'Requerimiento de elevación a juicio', 'CRIMINAL', 0, 'NONE'),
    STATE(4, 'Oposición al requerimiento de elevación', 'CRIMINAL', 5, 'BUSINESS'),
    STATE(5, 'Citación a juicio', 'CRIMINAL', 3, 'BUSINESS'),
    STATE(6, 'Ofrecimiento de prueba', 'CRIMINAL', 5, 'BUSINESS'),
    STATE(7, 'Recurso de apelación', 'CRIMINAL', 3, 'BUSINESS'),
    STATE(8, 'Recurso de casación', 'CRIMINAL', 15, 'BUSINESS'),
    STATE(9, 'Archivada', 'CRIMINAL', 0, 'NONE', true),
    STATE(10, 'Prescripta', 'CRIMINAL', 0, 'NONE', true),

    // ── Administrativo ──
    STATE(11, 'Notificación de imputación en sumario', 'ADMINISTRATIVE', 10, 'BUSINESS'),
    STATE(12, 'Presentación de descargo', 'ADMINISTRATIVE', 10, 'BUSINESS'),
    STATE(13, 'Levantamiento de medida cautelar', 'ADMINISTRATIVE', 5, 'BUSINESS'),
    STATE(14, 'Alegato', 'ADMINISTRATIVE', 6, 'BUSINESS'),
    STATE(15, 'Recurso de reconsideración', 'ADMINISTRATIVE', 10, 'BUSINESS'),
    STATE(16, 'Demanda contencioso administrativa', 'ADMINISTRATIVE', 30, 'CONSECUTIVE'),
    STATE(17, 'Archivada', 'ADMINISTRATIVE', 0, 'NONE', true),

    // ── Amparo ──
    STATE(18, 'Interposición de demanda de amparo', 'AMPARO', 0, 'NONE'),
    STATE(19, 'Traslado a la demandada', 'AMPARO', 3, 'BUSINESS'),
    STATE(20, 'Decreto de prueba', 'AMPARO', 3, 'BUSINESS'),
    STATE(21, 'Aporto la prueba', 'AMPARO', 5, 'BUSINESS'),
    STATE(22, 'Pase a fallo', 'AMPARO', 0, 'NONE'),
    STATE(23, 'Apelación de sentencia de amparo', 'AMPARO', 3, 'BUSINESS'),
    STATE(24, 'Archivada', 'AMPARO', 0, 'NONE', true),
];

/* ------------------------------------------------------------------ */
/* Calificaciones legales                                              */
/* ------------------------------------------------------------------ */

/** Cómo guarda la base una calificación: sin `activeCases`, que se calcula. */
export type StoredLegalQualification = Omit<LegalQualification, 'activeCases'>;

/**
 * Las ocho calificaciones del prototipo, con la prescripción en meses: 78 son
 * los "6 años y 6 meses" de Abuso de armas.
 *
 * La 9 está **dada de baja** a propósito. No aparece en el listado ni se puede
 * elegir en una causa nueva, pero la causa 13 la registra y la sigue mostrando
 * con su prescripción: es la excepción de §4 "Bajas".
 */
export const LEGAL_QUALIFICATIONS: readonly StoredLegalQualification[] = [
    { id: 1, name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96, active: true },
    { id: 2, name: 'Infracción Ley 23.737 — art. 5 inc. c', prescriptionMonths: 72, active: true },
    { id: 3, name: 'Lesiones graves — art. 90 CP', prescriptionMonths: 72, active: true },
    { id: 4, name: 'Amenazas coactivas — art. 149 bis CP', prescriptionMonths: 24, active: true },
    { id: 5, name: 'Homicidio simple — art. 79 CP', prescriptionMonths: 144, active: true },
    { id: 6, name: 'Hurto simple — art. 162 CP', prescriptionMonths: 24, active: true },
    { id: 7, name: 'Violación de domicilio — art. 150 CP', prescriptionMonths: 24, active: true },
    { id: 8, name: 'Abuso de armas — art. 104 CP', prescriptionMonths: 78, active: true },
    { id: 9, name: 'Encubrimiento — art. 277 CP', prescriptionMonths: 72, active: false },
];

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

/** Cómo guarda la base un cliente: sin `activeCases`, que se calcula. */
export type StoredClient = Omit<Client, 'activeCases'>;

const CLIENT = (
    id: number,
    lastName: string,
    firstName: string,
    dni: string,
    phone: string | null,
    email: string | null,
    clientSince: string,
    active = true,
): StoredClient => ({ id, lastName, firstName, dni, phone, email, clientSince, active });

/**
 * Los ocho clientes del prototipo más dieciséis de relleno: 23 vigentes, para
 * que el listado dé dos páginas.
 *
 * El DNI va **sin puntos** (V3 D-17); `RUIZ` tiene uno de siete dígitos, el
 * otro largo válido. `ACOSTA` y `CABRAL` no tienen correo y `PAZ` no tiene
 * teléfono: son los `null` que la tabla muestra con una raya.
 *
 * `SOSA` (id 8) está dada de baja: no tiene que aparecer en ningún lado, y su
 * DNI se puede volver a registrar, porque la unicidad es entre los vigentes.
 *
 * `JUÁREZ` y `RUIZ` no tienen causas: es el "Sin causas" de la tabla.
 */
export const CLIENTS: readonly StoredClient[] = [
    CLIENT(1, 'GÓMEZ', 'Ariel Fernando', '34812905', '351 415-2288', 'afgomez@gmail.com', '2021-03-12'),
    CLIENT(2, 'PEREYRA', 'Marcos D.', '29440117', '351 622-9014', 'mdpereyra@hotmail.com', '2026-05-18'),
    CLIENT(3, 'LUDUEÑA', 'Silvia', '20115883', '351 308-7742', 'sluduena@gmail.com', '2026-07-21'),
    CLIENT(4, 'ACOSTA', 'Jonathan E.', '38907221', '351 744-1160', null, '2022-01-19'),
    CLIENT(5, 'QUIROGA', 'Néstor A.', '26774309', '351 519-3320', 'naquiroga@gmail.com', '2026-06-02'),
    CLIENT(6, 'MOYANO', 'Daniela', '33028514', '351 267-8891', 'dmoyano@gmail.com', '2026-09-08'),
    CLIENT(7, 'BENÍTEZ', 'Rodrigo E.', '31556208', '351 401-5573', 'rbenitez@gmail.com', '2025-02-14'),
    CLIENT(8, 'SOSA', 'Verónica L.', '27903441', '351 330-2214', 'vlsosa@gmail.com', '2023-11-30', false),
    // Relleno, para llegar a dos páginas.
    CLIENT(9, 'AGÜERO', 'Luciana B.', '30112457', '351 220-4418', 'lbaguero@gmail.com', '2025-11-20'),
    CLIENT(10, 'BARRIONUEVO', 'Héctor M.', '24578913', '351 588-0172', 'hmbarrionuevo@yahoo.com.ar', '2019-05-02'),
    CLIENT(11, 'CABRAL', 'Mariano', '36221908', '351 690-3345', null, '2026-09-14'),
    CLIENT(12, 'DOMÍNGUEZ', 'Paola A.', '32004117', '351 475-9020', 'padominguez@gmail.com', '2026-04-07'),
    CLIENT(13, 'ESCUDERO', 'Raúl O.', '22890341', '351 312-6657', 'roescudero@hotmail.com', '2018-04-11'),
    CLIENT(14, 'FUNES', 'Claudia N.', '28765430', '351 804-1193', 'cnfunes@gmail.com', '2024-08-20'),
    CLIENT(15, 'GIMÉNEZ', 'Tomás', '40221876', '351 266-7308', 'tgimenez@gmail.com', '2023-06-15'),
    CLIENT(16, 'HERRERA', 'Sandra V.', '25334790', '351 541-2086', 'svherrera@gmail.com', '2025-03-03'),
    CLIENT(17, 'IBÁÑEZ', 'Cristian D.', '33987102', '351 709-5514', 'cdibanez@outlook.com', '2026-08-11'),
    CLIENT(18, 'JUÁREZ', 'Mónica E.', '21776054', '351 433-8871', 'mejuarez@gmail.com', '2026-09-10'),
    CLIENT(19, 'LEIVA', 'Gustavo A.', '29012663', '351 615-4402', 'galeiva@gmail.com', '2026-07-02'),
    CLIENT(20, 'MALDONADO', 'Érica', '37445981', '351 298-6630', 'emaldonado@gmail.com', '2025-09-09'),
    CLIENT(21, 'NAVARRO', 'Julio C.', '23650178', '351 520-7745', 'jcnavarro@yahoo.com.ar', '2024-02-12'),
    CLIENT(22, 'OLMOS', 'Débora R.', '31220945', '351 377-1269', 'drolmos@gmail.com', '2026-06-25'),
    CLIENT(23, 'PAZ', 'Ezequiel', '39101224', null, 'epaz@gmail.com', '2026-09-11'),
    CLIENT(24, 'RUIZ', 'Elvira T.', '9876543', '351 451-0038', 'etruiz@gmail.com', '2026-08-28'),
];

/* ------------------------------------------------------------------ */
/* Causas y actos procesales                                           */
/* ------------------------------------------------------------------ */

/**
 * Una fecha de semilla: fija (`YYYY-MM-DD`) o **relativa a hoy**, en días
 * hábiles hacia atrás.
 *
 * Las relativas existen por los vencimientos. El prototipo muestra una causa
 * que vence hoy, otra vencida hace dos días y otra a tres días hábiles; con
 * fechas fijas eso sería cierto un solo día, y a la semana todo el listado
 * estaría vencido. Con la fecha del acto atada a hoy, el listado se ve igual
 * que el prototipo cualquier día que se abra.
 */
export type SeedDate = string | { businessDaysAgo: number };

/** `n` días hábiles atrás. `0` es hoy. */
const AGO = (businessDaysAgo: number): SeedDate => ({ businessDaysAgo });

/** Un acto procesal de semilla. El vencimiento no se escribe: se calcula. */
export interface ActSeed {
    /** El id de un estado de la tabla del fuero, o el texto de un estado escrito a mano. */
    state: number | string;
    /** Fecha del acto. */
    on: SeedDate;
    /** Fecha de notificación. Sólo en el fuero administrativo (RN6). */
    notifiedOn?: SeedDate;
    /** Ajuste manual del vencimiento, en días hábiles desde hoy. */
    manualDueInBusinessDays?: number;
    notes?: string;
}

/** Una causa de semilla, con los actos que la llevaron a su estado actual. */
export interface CaseSeed {
    id: number;
    /** 8 dígitos, o `null` si la causa se registró sin SAC (D-33). */
    sacNumber: string | null;
    jurisdiction: Jurisdiction;
    caption: string;
    court: string | null;
    instructorName: string | null;
    /** Sólo el teléfono: el interno va en `instructorExtension`. */
    tribunalPhone: string | null;
    instructorExtension: string | null;
    clientId: number;
    proceduralRole: ProceduralRole;
    responsibleLawyerId: number;
    startDate: SeedDate;
    /** Sólo en el fuero penal, y ahí opcional (D-33): cada una con la fecha de su hecho. */
    qualifications?: { legalQualificationId: number; offenseDate: string }[];
    /** Sólo fuera del fuero penal. */
    counterparty?: string;
    /** Sólo fuera del fuero penal, y ahí obligatorio (D-27). */
    subjectMatter?: string;
    /** En orden cronológico. Vacío = la causa sigue en el estado inicial, "Iniciada" (D-34). */
    acts: ActSeed[];
}

const POLICE_COURT = 'Tribunal de Conducta Policial y Penitenciario';
const POLICE_INSTRUCTOR = 'Crio. Insp. Raúl Bazán';
const POLICE_PHONE = '0351 428-6000';
const POLICE_EXTENSION = '3120';

/**
 * 23 causas: las seis del prototipo y diecisiete más, elegidas para que cada
 * regla del contrato tenga un caso con el que probarla.
 *
 * | Causa | Para qué está |
 * | --- | --- |
 * | 1 a 6 | Las del prototipo: a un día hábil, vencida hace dos, a tres días, sin vencimiento, a diez días, vence hoy |
 * | 7, 11, 22 | En el estado inicial, **"Iniciada"** (`currentState.initial`), una por fuero. La 7 tiene dos calificaciones con hechos de fechas distintas |
 * | 8 | Estado **escrito a mano**, con el vencimiento ajustado manualmente |
 * | 9, 10, 21 | En estado **terminal** (Archivada, Prescripta): no son causas activas y no admiten actos |
 * | 12 | En un estado que no abre plazo: sin vencimiento |
 * | 13 | Registra una calificación **dada de baja** (la 9), que sigue mostrando |
 * | 14 | Plazo lejano, a quince días hábiles |
 * | 15 | Plazo en días **corridos** |
 * | 16 | Estado de la tabla con el vencimiento ajustado a mano |
 * | 17 | Segunda causa del mismo cliente (GÓMEZ), vencida hace una semana |
 * | 18, 20 | Los roles `DEFENDANT` y `PRIVATE_PROSECUTOR` |
 * | 23 | Penal **sin SAC y sin calificaciones legales** (D-33), todavía "Iniciada" |
 *
 * Los abogados 9 y 10 no tienen causas, y los clientes 18 y 24 tampoco.
 *
 * Quién lleva cada causa importa para probar los actos: sólo los registra el
 * abogado responsable (D-30). `mrios` (abogada 3) lleva la 1, la 9 y la 17;
 * `fvazquez` (abogado 1), la 4, la 6 y la 20.
 *
 * Los estados 4, 14 y 21 tienen una causa cada uno (la 1, la 2 y la 3): son
 * los que el prototipo muestra con "Hay N causas en este estado".
 */
export const CASE_SEEDS: readonly CaseSeed[] = [
    {
        id: 1,
        sacNumber: '13284571',
        jurisdiction: 'CRIMINAL',
        caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
        court: 'Juzgado de Control N° 3 · Córdoba',
        instructorName: 'Dra. Verónica Ledesma',
        tribunalPhone: '0351 448-1200',
        instructorExtension: '214',
        clientId: 1,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 3,
        startDate: '2021-03-12',
        qualifications: [{ legalQualificationId: 1, offenseDate: '2021-02-27' }],
        acts: [
            { state: 1, on: '2021-03-12', notes: 'El estudio asume la defensa técnica.' },
            { state: 3, on: AGO(9), notes: 'Presentado por la Fiscalía.' },
            { state: 4, on: AGO(4), notes: 'Abre el plazo de 5 días hábiles para oponerse.' },
        ],
    },
    {
        id: 2,
        sacNumber: '12907344',
        jurisdiction: 'ADMINISTRATIVE',
        caption: 'PEREYRA, Marcos D. — Sumario administrativo',
        court: POLICE_COURT,
        instructorName: POLICE_INSTRUCTOR,
        tribunalPhone: POLICE_PHONE,
        instructorExtension: POLICE_EXTENSION,
        clientId: 2,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 4,
        startDate: '2026-05-18',
        subjectMatter:
            'Descargo frente a la imputación de falta grave por abandono de servicio y pedido de sobreseimiento.',
        acts: [
            { state: 11, on: '2026-05-18', notifiedOn: '2026-05-18', notes: 'Plazo computado desde la notificación (RN6).' },
            { state: 12, on: '2026-08-28', notifiedOn: '2026-08-28', notes: 'Presentado en término.' },
            { state: 14, on: AGO(9), notifiedOn: AGO(8), notes: 'Clausura del sumario: abre el plazo de alegato.' },
        ],
    },
    {
        id: 3,
        sacNumber: '14002188',
        jurisdiction: 'AMPARO',
        caption: 'LUDUEÑA, Silvia c/ Provincia de Córdoba — Amparo',
        court: 'Juzgado Civil y Comercial 21ª Nom.',
        instructorName: 'Dr. Martín Sosa',
        tribunalPhone: '0351 448-1600',
        instructorExtension: '402',
        clientId: 3,
        proceduralRole: 'PLAINTIFF',
        responsibleLawyerId: 5,
        startDate: '2026-07-21',
        counterparty: 'Provincia de Córdoba',
        subjectMatter:
            'Se ordene a la Provincia de Córdoba otorgar la prestación por discapacidad denegada por resolución ministerial.',
        acts: [
            { state: 18, on: '2026-07-21', notes: 'Con pedido de medida cautelar.' },
            { state: 19, on: '2026-07-30', notes: 'Notificado.' },
            { state: 21, on: AGO(2), notes: 'Decreto de prueba: abre el plazo para aportar la prueba ordenada.' },
        ],
    },
    {
        id: 4,
        sacNumber: '11845620',
        jurisdiction: 'CRIMINAL',
        caption: 'ACOSTA, Jonathan E. p.s.a. Infracción Ley 23.737',
        court: 'Fiscalía de Instrucción Distrito 2 Turno 4',
        instructorName: 'Fisc. Adj. Paula Rinaldi',
        tribunalPhone: '0351 448-1150',
        instructorExtension: '118',
        clientId: 4,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 1,
        startDate: '2022-01-19',
        qualifications: [{ legalQualificationId: 2, offenseDate: '2022-01-19' }],
        acts: [
            { state: 1, on: '2022-01-19', notes: 'El estudio asume la defensa técnica.' },
            { state: 3, on: '2026-07-06', notes: 'Última actuación registrada.' },
        ],
    },
    {
        id: 5,
        sacNumber: '13560902',
        jurisdiction: 'ADMINISTRATIVE',
        caption: 'QUIROGA, Néstor A. — Recurso de reconsideración',
        court: POLICE_COURT,
        instructorName: POLICE_INSTRUCTOR,
        tribunalPhone: POLICE_PHONE,
        instructorExtension: POLICE_EXTENSION,
        clientId: 5,
        proceduralRole: 'APPELLANT',
        responsibleLawyerId: 2,
        startDate: '2026-06-02',
        counterparty: 'Tribunal de Conducta Policial y Penitenciario',
        subjectMatter:
            'Se deje sin efecto la sanción de cesantía dispuesta por el Tribunal de Conducta Policial y se reincorpore al agente.',
        acts: [
            { state: 11, on: '2026-06-02', notifiedOn: '2026-06-02' },
            { state: 15, on: AGO(1), notifiedOn: AGO(0), notes: 'Notificación de la resolución: abre 10 días hábiles.' },
        ],
    },
    {
        id: 6,
        sacNumber: '12774310',
        jurisdiction: 'AMPARO',
        caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
        court: 'Juzgado Civil y Comercial 37ª Nom.',
        instructorName: 'Dra. Inés Ferrero',
        tribunalPhone: '0351 448-1600',
        instructorExtension: '517',
        clientId: 6,
        proceduralRole: 'PLAINTIFF',
        responsibleLawyerId: 1,
        startDate: '2026-09-08',
        counterparty: 'APROSS',
        subjectMatter:
            'Se ordene a APROSS la cobertura integral del tratamiento de rehabilitación prescripto a la actora.',
        acts: [
            { state: 18, on: AGO(5), notes: 'Amparo de salud contra APROSS.' },
            { state: 19, on: AGO(3), notes: 'Decreto de traslado.' },
        ],
    },
    {
        id: 7,
        sacNumber: '14118903',
        jurisdiction: 'CRIMINAL',
        caption: 'BENÍTEZ, Rodrigo E. p.s.a. Lesiones graves y Amenazas coactivas',
        court: 'Fiscalía de Instrucción Distrito 1 Turno 2',
        instructorName: 'Fisc. Diego Albornoz',
        tribunalPhone: '0351 448-1100',
        instructorExtension: '305',
        clientId: 7,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 6,
        startDate: AGO(1),
        qualifications: [
            { legalQualificationId: 3, offenseDate: '2026-08-30' },
            { legalQualificationId: 4, offenseDate: '2026-09-02' },
        ],
        acts: [],
    },
    {
        id: 8,
        sacNumber: '13077215',
        jurisdiction: 'CRIMINAL',
        caption: 'AGÜERO, Luciana B. p.s.a. Abuso de armas',
        court: 'Juzgado de Control N° 7 · Córdoba',
        instructorName: 'Dr. Pablo Carranza',
        tribunalPhone: '0351 448-1200',
        instructorExtension: '261',
        clientId: 9,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 7,
        startDate: '2025-12-01',
        qualifications: [{ legalQualificationId: 8, offenseDate: '2025-11-14' }],
        acts: [
            { state: 1, on: '2025-12-01' },
            {
                state: 'Con acusación, pero con oposición',
                on: AGO(3),
                manualDueInBusinessDays: 4,
                notes: 'La Fiscalía acusó y la defensa ya adelantó su oposición.',
            },
        ],
    },
    {
        id: 9,
        sacNumber: '10556781',
        jurisdiction: 'CRIMINAL',
        caption: 'BARRIONUEVO, Héctor M. p.s.a. Hurto simple',
        court: 'Juzgado de Control N° 2 · Córdoba',
        instructorName: null,
        tribunalPhone: null,
        instructorExtension: null,
        clientId: 10,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 3,
        startDate: '2019-05-02',
        qualifications: [{ legalQualificationId: 6, offenseDate: '2019-04-10' }],
        acts: [
            { state: 1, on: '2019-05-02' },
            { state: 9, on: '2020-11-17', notes: 'Sobreseimiento firme.' },
        ],
    },
    {
        id: 10,
        sacNumber: '10230417',
        jurisdiction: 'CRIMINAL',
        caption: 'ESCUDERO, Raúl O. p.s.a. Violación de domicilio',
        court: 'Fiscalía de Instrucción Distrito 3 Turno 1',
        instructorName: null,
        tribunalPhone: null,
        instructorExtension: null,
        clientId: 13,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 2,
        startDate: '2018-04-11',
        qualifications: [{ legalQualificationId: 7, offenseDate: '2018-03-05' }],
        acts: [
            { state: 1, on: '2018-04-11' },
            { state: 10, on: '2020-03-05', notes: 'Prescripción declarada.' },
        ],
    },
    {
        id: 11,
        sacNumber: '14120566',
        jurisdiction: 'ADMINISTRATIVE',
        caption: 'CABRAL, Mariano — Policía de la Provincia · Sumario administrativo',
        court: POLICE_COURT,
        instructorName: null,
        tribunalPhone: null,
        instructorExtension: null,
        clientId: 11,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 4,
        startDate: AGO(0),
        counterparty: 'Policía de la Provincia',
        subjectMatter: 'Defensa del agente en el sumario iniciado por presunta falta en el servicio.',
        acts: [],
    },
    {
        id: 12,
        sacNumber: '13902244',
        jurisdiction: 'AMPARO',
        caption: 'DOMÍNGUEZ, Paola A. c/ APROSS — Amparo',
        court: 'Juzgado Civil y Comercial 9ª Nom.',
        instructorName: 'Dra. Carla Monje',
        tribunalPhone: '0351 448-1600',
        instructorExtension: '233',
        clientId: 12,
        proceduralRole: 'PLAINTIFF',
        responsibleLawyerId: 5,
        startDate: '2026-04-07',
        counterparty: 'APROSS',
        subjectMatter: 'Se ordene a APROSS proveer la medicación oncológica indicada por el médico tratante.',
        acts: [
            { state: 18, on: '2026-04-07' },
            { state: 19, on: '2026-04-16' },
            { state: 22, on: AGO(6), notes: 'Autos a fallo.' },
        ],
    },
    {
        id: 13,
        sacNumber: '12660318',
        jurisdiction: 'CRIMINAL',
        caption: 'FUNES, Claudia N. p.s.a. Encubrimiento y Amenazas coactivas',
        court: 'Cámara en lo Criminal y Correccional 5ª Nom.',
        instructorName: 'Dr. Hernán Paredes',
        tribunalPhone: '0351 448-1300',
        instructorExtension: '142',
        clientId: 14,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 6,
        startDate: '2024-08-20',
        qualifications: [
            { legalQualificationId: 9, offenseDate: '2024-06-11' },
            { legalQualificationId: 4, offenseDate: '2024-07-02' },
        ],
        acts: [
            { state: 1, on: '2024-08-20' },
            { state: 5, on: AGO(1) },
        ],
    },
    {
        id: 14,
        sacNumber: '13345092',
        jurisdiction: 'CRIMINAL',
        caption: 'GIMÉNEZ, Tomás p.s.a. Robo calificado',
        court: 'Tribunal Superior de Justicia · Sala Penal',
        instructorName: null,
        tribunalPhone: null,
        instructorExtension: null,
        clientId: 15,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 7,
        startDate: '2023-06-15',
        qualifications: [{ legalQualificationId: 1, offenseDate: '2023-05-28' }],
        acts: [
            { state: 1, on: '2023-06-15' },
            { state: 8, on: AGO(0), notes: 'Notificada la sentencia de la Cámara.' },
        ],
    },
    {
        id: 15,
        sacNumber: '12998740',
        jurisdiction: 'ADMINISTRATIVE',
        caption: 'HERRERA, Sandra V. — Servicio Penitenciario · Demanda contencioso administrativa',
        court: 'Cámara Contencioso Administrativa 1ª Nom.',
        instructorName: 'Dr. Luis Zamora',
        tribunalPhone: '0351 448-1700',
        instructorExtension: '88',
        clientId: 16,
        proceduralRole: 'APPELLANT',
        responsibleLawyerId: 8,
        startDate: '2025-03-03',
        counterparty: 'Servicio Penitenciario de Córdoba',
        subjectMatter:
            'Se declare la nulidad de la resolución que rechazó el recurso jerárquico y se ordene el pago de los haberes retenidos.',
        acts: [
            { state: 11, on: '2025-03-03', notifiedOn: '2025-03-03' },
            { state: 16, on: AGO(5), notifiedOn: AGO(4), notes: 'Agotada la vía administrativa.' },
        ],
    },
    {
        id: 16,
        sacNumber: '13711859',
        jurisdiction: 'AMPARO',
        caption: 'IBÁÑEZ, Cristian D. c/ Municipalidad de Córdoba — Amparo por mora',
        court: 'Juzgado Civil y Comercial 14ª Nom.',
        instructorName: 'Dr. Andrés Villagra',
        tribunalPhone: '0351 448-1600',
        instructorExtension: '371',
        clientId: 17,
        proceduralRole: 'PLAINTIFF',
        responsibleLawyerId: 8,
        startDate: '2026-08-11',
        counterparty: 'Municipalidad de Córdoba',
        subjectMatter: 'Se emplace a la Municipalidad a resolver el pedido de habilitación presentado hace más de un año.',
        acts: [
            { state: 18, on: '2026-08-11' },
            {
                state: 20,
                on: AGO(2),
                manualDueInBusinessDays: 6,
                notes: 'El juzgado amplió el plazo para producir la prueba informativa.',
            },
        ],
    },
    {
        id: 17,
        sacNumber: '12104893',
        jurisdiction: 'CRIMINAL',
        caption: 'GÓMEZ, Ariel Fernando p.s.a. Amenazas coactivas',
        court: 'Cámara en lo Criminal y Correccional 2ª Nom.',
        instructorName: 'Dra. Verónica Ledesma',
        tribunalPhone: '0351 448-1200',
        instructorExtension: '214',
        clientId: 1,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 3,
        startDate: '2025-10-06',
        qualifications: [{ legalQualificationId: 4, offenseDate: '2025-09-19' }],
        acts: [
            { state: 1, on: '2025-10-06' },
            { state: 6, on: AGO(12), notes: 'Decreto que abre el ofrecimiento de prueba.' },
        ],
    },
    {
        id: 18,
        sacNumber: '13488127',
        jurisdiction: 'AMPARO',
        caption: 'Asociación Mutual del Personal Policial c/ OLMOS, Débora R. — Amparo',
        court: 'Juzgado Civil y Comercial 30ª Nom.',
        instructorName: null,
        tribunalPhone: null,
        instructorExtension: null,
        clientId: 22,
        proceduralRole: 'DEFENDANT',
        responsibleLawyerId: 5,
        startDate: '2026-06-25',
        counterparty: 'Asociación Mutual del Personal Policial',
        subjectMatter: 'Rechazo del amparo interpuesto contra la afiliada por la suspensión de la cuota social.',
        acts: [
            { state: 18, on: '2026-06-25' },
            { state: 23, on: AGO(1), notes: 'Notificada la sentencia de primera instancia.' },
        ],
    },
    {
        id: 19,
        sacNumber: '13250674',
        jurisdiction: 'ADMINISTRATIVE',
        caption: 'LEIVA, Gustavo A. — Sumario administrativo',
        court: POLICE_COURT,
        instructorName: POLICE_INSTRUCTOR,
        tribunalPhone: POLICE_PHONE,
        instructorExtension: POLICE_EXTENSION,
        clientId: 19,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 2,
        startDate: '2026-07-02',
        subjectMatter: 'Descargo por la imputación de uso indebido del arma reglamentaria.',
        acts: [
            { state: 11, on: '2026-07-02', notifiedOn: '2026-07-02' },
            { state: 12, on: AGO(4), notifiedOn: AGO(3) },
        ],
    },
    {
        id: 20,
        sacNumber: '11990352',
        jurisdiction: 'CRIMINAL',
        caption: 'N.N. p.s.a. Lesiones graves — querellante MALDONADO, Érica',
        court: 'Fiscalía de Instrucción Distrito 4 Turno 3',
        instructorName: 'Fisc. Marina Ochoa',
        tribunalPhone: '0351 448-1180',
        instructorExtension: '207',
        clientId: 20,
        proceduralRole: 'PRIVATE_PROSECUTOR',
        responsibleLawyerId: 1,
        startDate: '2025-09-09',
        qualifications: [{ legalQualificationId: 3, offenseDate: '2025-08-23' }],
        acts: [
            { state: 1, on: '2025-09-09', notes: 'Constitución en querellante particular.' },
            { state: 2, on: AGO(3) },
        ],
    },
    {
        id: 21,
        sacNumber: '12881406',
        jurisdiction: 'ADMINISTRATIVE',
        caption: 'NAVARRO, Julio C. — Sumario administrativo',
        court: POLICE_COURT,
        instructorName: null,
        tribunalPhone: null,
        instructorExtension: null,
        clientId: 21,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 4,
        startDate: '2024-02-12',
        subjectMatter: 'Descargo en el sumario por inasistencias injustificadas.',
        acts: [
            { state: 11, on: '2024-02-12', notifiedOn: '2024-02-12' },
            { state: 17, on: '2024-09-30', notes: 'Sumario archivado sin sanción.' },
        ],
    },
    {
        id: 22,
        sacNumber: '13619027',
        jurisdiction: 'AMPARO',
        caption: 'PAZ, Ezequiel c/ APROSS — Amparo',
        court: null,
        instructorName: null,
        tribunalPhone: null,
        instructorExtension: null,
        clientId: 23,
        proceduralRole: 'PLAINTIFF',
        responsibleLawyerId: 7,
        startDate: AGO(2),
        counterparty: 'APROSS',
        subjectMatter: 'Se ordene a APROSS la cobertura de la prótesis indicada, denegada por nota del área de auditoría.',
        acts: [],
    },
    {
        id: 23,
        // Todavía no tiene SAC ni calificación legal: los dos son opcionales (D-33).
        sacNumber: null,
        jurisdiction: 'CRIMINAL',
        caption: 'LEIVA, Gustavo A. — Actuaciones preliminares',
        court: null,
        instructorName: null,
        tribunalPhone: null,
        instructorExtension: null,
        clientId: 19,
        proceduralRole: 'DEFENSE',
        responsibleLawyerId: 6,
        startDate: AGO(0),
        acts: [],
    },
];

/* ------------------------------------------------------------------ */
/* Reglas de negocio simuladas                                         */
/* ------------------------------------------------------------------ */

/**
 * Usuarios que no se pueden dar de baja: el mock responde `409` con
 * `USER_HAS_DEPENDENCIES`. Son las cuentas de tres abogados con causas a su
 * cargo (Ríos, Peralta y Bustos).
 */
export const USERS_WITH_DEPENDENCIES: readonly number[] = [3, 4, 5];

/**
 * El administrador original no se puede dar de baja ni degradar: el mock
 * responde `422` con `BUSINESS_RULE_VIOLATION`. Es el caso "el sistema tiene
 * que conservar al menos un administrador".
 */
export const PROTECTED_ADMIN_USER = 1;
