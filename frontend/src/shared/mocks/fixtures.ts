/**
 * Datos semilla del mock.
 *
 * Son constantes de sólo lectura: el servidor falso trabaja sobre una copia
 * (ver `db.ts`), así que se pueden importar desde un test o una pantalla sin
 * miedo a que alguien las haya mutado antes.
 *
 * El volumen está elegido a propósito para que la paginación del contrato se
 * pueda probar: con el `limit` por defecto de 20 los usuarios dan 2 páginas y
 * los estados procesales también.
 */

import type { Lawyer, ProceduralState, User } from './contract';

/* ------------------------------------------------------------------ */
/* Credenciales                                                        */
/* ------------------------------------------------------------------ */

/**
 * Contraseña de todos los usuarios semilla, salvo las de `CREDENTIALS`.
 * El contrato usa `admin` / `password` en el ejemplo del login.
 */
export const DEFAULT_PASSWORD = 'password';

/** Contraseñas por usuario. Lo que no esté acá usa `DEFAULT_PASSWORD`. */
export const CREDENTIALS: Record<string, string> = {
    admin: 'password',
    jperez: 'abogado123',
    mdominguez: 'secre123',
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

export const LAWYERS: readonly Lawyer[] = [
    { id: 1, firstName: 'Juan', lastName: 'Pérez', registrationNumber: 'MP-12345', email: 'juan.perez@example.com', phone: '351249249' },
    { id: 2, firstName: 'María', lastName: 'Domínguez', registrationNumber: 'MP-10482', email: 'maria.dominguez@example.com', phone: '351204871' },
    { id: 3, firstName: 'Carlos', lastName: 'Bianchi', registrationNumber: 'MP-20713', email: 'carlos.bianchi@example.com', phone: '351663094' },
    { id: 4, firstName: 'Lucía', lastName: 'Fernández', registrationNumber: 'MP-31860', email: 'lucia.fernandez@example.com', phone: '351778512' },
    { id: 5, firstName: 'Martín', lastName: 'Quiroga', registrationNumber: 'MP-14509', email: 'martin.quiroga@example.com', phone: '351330927' },
    { id: 6, firstName: 'Sofía', lastName: 'Ledesma', registrationNumber: 'MP-27341', email: 'sofia.ledesma@example.com', phone: '351415688' },
    { id: 7, firstName: 'Diego', lastName: 'Arrieta', registrationNumber: 'MP-18904', email: 'diego.arrieta@example.com', phone: '351902374' },
    { id: 8, firstName: 'Valeria', lastName: 'Sosa', registrationNumber: 'MP-22615', email: 'valeria.sosa@example.com', phone: '351586210' },
    { id: 9, firstName: 'Ramiro', lastName: 'Ocampo', registrationNumber: 'MP-30128', email: 'ramiro.ocampo@example.com', phone: '351247733' },
    { id: 10, firstName: 'Agustina', lastName: 'Ferreyra', registrationNumber: 'MP-11736', email: 'agustina.ferreyra@example.com', phone: '351860145' },
    { id: 11, firstName: 'Nicolás', lastName: 'Vargas', registrationNumber: 'MP-25490', email: 'nicolas.vargas@example.com', phone: '351119802' },
    { id: 12, firstName: 'Paula', lastName: 'Cabrera', registrationNumber: 'MP-19052', email: 'paula.cabrera@example.com', phone: '351374026' },
    { id: 13, firstName: 'Federico', lastName: 'Luna', registrationNumber: 'MP-28317', email: 'federico.luna@example.com', phone: '351650918' },
    { id: 14, firstName: 'Camila', lastName: 'Ibarra', registrationNumber: 'MP-13664', email: 'camila.ibarra@example.com', phone: '351298470' },
];

/* ------------------------------------------------------------------ */
/* Usuarios                                                            */
/* ------------------------------------------------------------------ */

/**
 * 22 usuarios: el `admin` del contrato, abogados con cuenta, secretaría y
 * dos casos mixtos (`role` con dos entradas) para que la UI no asuma que el
 * arreglo tiene siempre un solo elemento.
 */
export const USERS: readonly User[] = [
    { id: 1, username: 'admin', role: ['ADMINISTATOR'] },
    { id: 2, username: 'jperez', role: ['LAWYER', 'ADMINISTATOR'] },
    { id: 3, username: 'mdominguez', role: ['SECRETARIAT'] },
    { id: 4, username: 'cbianchi', role: ['LAWYER'] },
    { id: 5, username: 'lfernandez', role: ['LAWYER'] },
    { id: 6, username: 'mquiroga', role: ['LAWYER'] },
    { id: 7, username: 'sledesma', role: ['LAWYER', 'SECRETARIAT'] },
    { id: 8, username: 'darrieta', role: ['LAWYER'] },
    { id: 9, username: 'vsosa', role: ['LAWYER'] },
    { id: 10, username: 'rocampo', role: ['LAWYER'] },
    { id: 11, username: 'aferreyra', role: ['LAWYER'] },
    { id: 12, username: 'nvargas', role: ['LAWYER'] },
    { id: 13, username: 'pcabrera', role: ['LAWYER'] },
    { id: 14, username: 'fluna', role: ['LAWYER'] },
    { id: 15, username: 'cibarra', role: ['LAWYER'] },
    { id: 16, username: 'rmoyano', role: ['SECRETARIAT'] },
    { id: 17, username: 'gsalinas', role: ['SECRETARIAT'] },
    { id: 18, username: 'ynunez', role: ['SECRETARIAT'] },
    { id: 19, username: 'ltoledo', role: ['SECRETARIAT'] },
    { id: 20, username: 'earroyo', role: ['SECRETARIAT'] },
    { id: 21, username: 'supervision', role: ['ADMINISTATOR'] },
    { id: 22, username: 'mesaentrada', role: ['SECRETARIAT'] },
];

/**
 * Qué usuario corresponde a qué abogado.
 *
 * El contrato manda `abogadoId` al crear un usuario pero **no lo devuelve**
 * en ninguna respuesta, así que el vínculo no vive dentro de `User`. Se
 * guarda acá aparte para poder aplicar la regla "un usuario LAWYER tiene que
 * tener abogado asociado" sin inventar campos que el contrato no define.
 */
export const USER_LAWYER: Readonly<Record<number, number>> = {
    2: 1,
    4: 3,
    5: 4,
    6: 5,
    7: 6,
    8: 7,
    9: 8,
    10: 9,
    11: 10,
    12: 11,
    13: 12,
    14: 13,
    15: 14,
};

/* ------------------------------------------------------------------ */
/* Estados procesales                                                  */
/* ------------------------------------------------------------------ */

/**
 * 24 estados repartidos en los tres fueros del estudio: el ciclo de vida
 * completo, tal como lo muestra el prototipo (`frontend/docs/prototypes/`).
 * Con el `limit=20` por defecto dan dos páginas.
 *
 * Los nombres van en castellano y como texto libre, no como constantes en
 * inglés: es el vocabulario con el que el estudio los escribe en el
 * expediente, y en un ABM los carga una persona. El ejemplo del contrato usa
 * `"ALLEGATION"`, pero es sólo un ejemplo.
 *
 * "Archivada" aparece en los tres fueros (ids 9, 17 y 24): por eso la
 * unicidad del mock es por **nombre + fuero** y no por nombre solo.
 *
 * HUECO DEL CONTRATO: los estados terminales o de puro trámite no abren
 * ningún plazo —en el prototipo muestran `—` en la columna "Días"— pero el
 * contrato no tiene cómo expresarlo. Acá van como `'0'` + `BUSINESS`, que no
 * es lo mismo: "0 días hábiles" vence hoy, "sin plazo" no vence nunca. Hay
 * que resolverlo con el backend antes de que el módulo de vencimientos lea
 * esta tabla.
 *
 * `proceduralTimeLimit` es string porque así lo define el contrato.
 */
export const PROCEDURAL_STATES: readonly ProceduralState[] = [
    // ── Penal ──
    { id: 1, name: 'Designación de abogado defensor', jurisdiction: 'CRIMINAL', proceduralTimeLimit: '0', dayType: 'BUSINESS' },
    { id: 2, name: 'Cédula de notificación', jurisdiction: 'CRIMINAL', proceduralTimeLimit: '3', dayType: 'BUSINESS' },
    { id: 3, name: 'Requerimiento de elevación a juicio', jurisdiction: 'CRIMINAL', proceduralTimeLimit: '0', dayType: 'BUSINESS' },
    { id: 4, name: 'Oposición al requerimiento de elevación', jurisdiction: 'CRIMINAL', proceduralTimeLimit: '5', dayType: 'BUSINESS' },
    { id: 5, name: 'Citación a juicio', jurisdiction: 'CRIMINAL', proceduralTimeLimit: '3', dayType: 'BUSINESS' },
    { id: 6, name: 'Ofrecimiento de prueba', jurisdiction: 'CRIMINAL', proceduralTimeLimit: '5', dayType: 'BUSINESS' },
    { id: 7, name: 'Recurso de apelación', jurisdiction: 'CRIMINAL', proceduralTimeLimit: '3', dayType: 'BUSINESS' },
    { id: 8, name: 'Recurso de casación', jurisdiction: 'CRIMINAL', proceduralTimeLimit: '15', dayType: 'BUSINESS' },
    { id: 9, name: 'Archivada', jurisdiction: 'CRIMINAL', proceduralTimeLimit: '0', dayType: 'BUSINESS' },
    { id: 10, name: 'Prescripta', jurisdiction: 'CRIMINAL', proceduralTimeLimit: '0', dayType: 'BUSINESS' },

    // ── Administrativo ──
    { id: 11, name: 'Notificación de imputación en sumario', jurisdiction: 'ADMINISTRATIVE', proceduralTimeLimit: '10', dayType: 'BUSINESS' },
    { id: 12, name: 'Presentación de descargo', jurisdiction: 'ADMINISTRATIVE', proceduralTimeLimit: '10', dayType: 'BUSINESS' },
    { id: 13, name: 'Levantamiento de medida cautelar', jurisdiction: 'ADMINISTRATIVE', proceduralTimeLimit: '5', dayType: 'BUSINESS' },
    { id: 14, name: 'Alegato', jurisdiction: 'ADMINISTRATIVE', proceduralTimeLimit: '6', dayType: 'BUSINESS' },
    { id: 15, name: 'Recurso de reconsideración', jurisdiction: 'ADMINISTRATIVE', proceduralTimeLimit: '10', dayType: 'BUSINESS' },
    { id: 16, name: 'Demanda contencioso administrativa', jurisdiction: 'ADMINISTRATIVE', proceduralTimeLimit: '30', dayType: 'CONSECUTIVE' },
    { id: 17, name: 'Archivada', jurisdiction: 'ADMINISTRATIVE', proceduralTimeLimit: '0', dayType: 'BUSINESS' },

    // ── Amparo ──
    { id: 18, name: 'Interposición de demanda de amparo', jurisdiction: 'AMPARO', proceduralTimeLimit: '0', dayType: 'BUSINESS' },
    { id: 19, name: 'Traslado a la demandada', jurisdiction: 'AMPARO', proceduralTimeLimit: '3', dayType: 'BUSINESS' },
    { id: 20, name: 'Decreto de prueba', jurisdiction: 'AMPARO', proceduralTimeLimit: '3', dayType: 'BUSINESS' },
    { id: 21, name: 'Aporto la prueba', jurisdiction: 'AMPARO', proceduralTimeLimit: '5', dayType: 'BUSINESS' },
    { id: 22, name: 'Pase a fallo', jurisdiction: 'AMPARO', proceduralTimeLimit: '0', dayType: 'BUSINESS' },
    { id: 23, name: 'Apelación de sentencia de amparo', jurisdiction: 'AMPARO', proceduralTimeLimit: '3', dayType: 'BUSINESS' },
    { id: 24, name: 'Archivada', jurisdiction: 'AMPARO', proceduralTimeLimit: '0', dayType: 'BUSINESS' },
];

/* ------------------------------------------------------------------ */
/* Reglas de negocio simuladas                                         */
/* ------------------------------------------------------------------ */

/**
 * Usuarios que no se pueden borrar: el mock responde `409` con
 * `USER_HAS_DEPENDENCIES`. Representan cuentas con causas asignadas.
 */
export const USERS_WITH_DEPENDENCIES: readonly number[] = [2, 4, 9];

/**
 * El `admin` original no se puede eliminar ni degradar: el mock responde
 * `422` con `BUSINESS_RULE_VIOLATION`. Es el caso "el sistema tiene que
 * conservar al menos un administrador".
 */
export const PROTECTED_ADMIN_USER = 1;

/**
 * Estados procesales que no se pueden borrar: el mock responde `409` con
 * `PROCEDURAL_STATE_HAS_DEPENDENCIES`. Representan estados con causas
 * asociadas — el caso que el prototipo muestra como "Hay N causas en este
 * estado".
 *
 * PROPUESTA: el contrato v1 no define la baja. Ver el README.
 */
export const PROCEDURAL_STATES_WITH_DEPENDENCIES: readonly number[] = [4, 14, 21];

