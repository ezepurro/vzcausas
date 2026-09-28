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
 * `limit` por defecto de 20, los usuarios y los estados procesales dan dos
 * páginas.
 */

import type { Jurisdiction, Lawyer, ProceduralState, Role } from './contract';

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
 * `activeCases` va en `0` porque el módulo de causas todavía no existe: el
 * contrato define el campo desde ahora para no cambiar la forma del recurso
 * más adelante.
 *
 * Un abogado tiene a lo sumo **una** cuenta activa (`LAWYER_ALREADY_LINKED`
 * en el backend). Por eso cada usuario que ejerce tiene su propia ficha, y
 * las dos últimas quedan **sin cuenta**: son las que se pueden vincular en
 * un alta sin chocar con esa regla.
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

/**
 * 24 estados repartidos en los tres fueros del estudio: el ciclo de vida
 * completo, tal como lo muestra el prototipo. Con `limit=20` dan dos páginas.
 *
 * Los nombres van en castellano y como texto libre: es el vocabulario con el
 * que el estudio los escribe en el expediente, y en un ABM los carga una
 * persona (RN4).
 *
 * `position` es la numeración que el prototipo muestra al costado de cada
 * estado, y arranca en 1 **dentro de cada fuero**.
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
    position: number,
    timeLimitDays: number,
    dayType: ProceduralState['dayType'],
    terminal = false,
): ProceduralState => ({
    id,
    name,
    jurisdiction,
    position,
    timeLimitDays,
    dayType,
    terminal,
    activeCases: 0,
    active: true,
});

export const PROCEDURAL_STATES: readonly ProceduralState[] = [
    // ── Penal ──
    STATE(1, 'Designación de abogado defensor', 'CRIMINAL', 1, 0, 'NONE'),
    STATE(2, 'Cédula de notificación', 'CRIMINAL', 2, 3, 'BUSINESS'),
    STATE(3, 'Requerimiento de elevación a juicio', 'CRIMINAL', 3, 0, 'NONE'),
    STATE(4, 'Oposición al requerimiento de elevación', 'CRIMINAL', 4, 5, 'BUSINESS'),
    STATE(5, 'Citación a juicio', 'CRIMINAL', 5, 3, 'BUSINESS'),
    STATE(6, 'Ofrecimiento de prueba', 'CRIMINAL', 6, 5, 'BUSINESS'),
    STATE(7, 'Recurso de apelación', 'CRIMINAL', 7, 3, 'BUSINESS'),
    STATE(8, 'Recurso de casación', 'CRIMINAL', 8, 15, 'BUSINESS'),
    STATE(9, 'Archivada', 'CRIMINAL', 9, 0, 'NONE', true),
    STATE(10, 'Prescripta', 'CRIMINAL', 10, 0, 'NONE', true),

    // ── Administrativo ──
    STATE(11, 'Notificación de imputación en sumario', 'ADMINISTRATIVE', 1, 10, 'BUSINESS'),
    STATE(12, 'Presentación de descargo', 'ADMINISTRATIVE', 2, 10, 'BUSINESS'),
    STATE(13, 'Levantamiento de medida cautelar', 'ADMINISTRATIVE', 3, 5, 'BUSINESS'),
    STATE(14, 'Alegato', 'ADMINISTRATIVE', 4, 6, 'BUSINESS'),
    STATE(15, 'Recurso de reconsideración', 'ADMINISTRATIVE', 5, 10, 'BUSINESS'),
    STATE(16, 'Demanda contencioso administrativa', 'ADMINISTRATIVE', 6, 30, 'CONSECUTIVE'),
    STATE(17, 'Archivada', 'ADMINISTRATIVE', 7, 0, 'NONE', true),

    // ── Amparo ──
    STATE(18, 'Interposición de demanda de amparo', 'AMPARO', 1, 0, 'NONE'),
    STATE(19, 'Traslado a la demandada', 'AMPARO', 2, 3, 'BUSINESS'),
    STATE(20, 'Decreto de prueba', 'AMPARO', 3, 3, 'BUSINESS'),
    STATE(21, 'Aporto la prueba', 'AMPARO', 4, 5, 'BUSINESS'),
    STATE(22, 'Pase a fallo', 'AMPARO', 5, 0, 'NONE'),
    STATE(23, 'Apelación de sentencia de amparo', 'AMPARO', 6, 3, 'BUSINESS'),
    STATE(24, 'Archivada', 'AMPARO', 7, 0, 'NONE', true),
];

/* ------------------------------------------------------------------ */
/* Reglas de negocio simuladas                                         */
/* ------------------------------------------------------------------ */

/**
 * Usuarios que no se pueden dar de baja: el mock responde `409` con
 * `USER_HAS_DEPENDENCIES`. Representan cuentas con causas asignadas.
 */
export const USERS_WITH_DEPENDENCIES: readonly number[] = [3, 4, 5];

/**
 * El administrador original no se puede dar de baja ni degradar: el mock
 * responde `422` con `BUSINESS_RULE_VIOLATION`. Es el caso "el sistema tiene
 * que conservar al menos un administrador".
 */
export const PROTECTED_ADMIN_USER = 1;

/**
 * Abogados que no se pueden dar de baja: el mock responde `409` con
 * `LAWYER_HAS_DEPENDENCIES`. Representan profesionales con causas activas.
 */
export const LAWYERS_WITH_DEPENDENCIES: readonly number[] = [1, 3];

/**
 * Estados procesales que no se pueden dar de baja: el mock responde `409`
 * con `PROCEDURAL_STATE_HAS_DEPENDENCIES`. Representan estados con causas
 * asociadas — lo que el prototipo muestra como "Hay N causas en este estado".
 */
export const PROCEDURAL_STATES_WITH_DEPENDENCIES: readonly number[] = [4, 14, 21];
