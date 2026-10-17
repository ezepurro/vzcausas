/**
 * Tipos del contrato de API.
 *
 * Fuente: `docs/Api-Contract/API_CONTRACT_V4.md` (14/10/2026), que contiene a
 * V3 entero con los cambios del Sprint 3. Este archivo es la traducción literal
 * del documento a TypeScript.
 *
 * Los **mensajes** quedan en castellano porque son los que define el
 * contrato y los que ve el usuario; lo que está en inglés es el código.
 *
 * El contrato anterior tenía seis divergencias (roles con dos vocabularios y
 * dos formas, `abogadoId` en castellano, el 401 del login con otro
 * envoltorio, el plazo como string). **Ya no existen**: el contrato vigente
 * las resolvió y este archivo no tiene que replicar ninguna.
 */

/** Base URL del contrato (§4). El mock acepta pedidos con o sin este prefijo. */
export const BASE_PATH = '/api/v1';

/* ------------------------------------------------------------------ */
/* Enumerados (§2)                                                     */
/* ------------------------------------------------------------------ */

/**
 * Roles del usuario. Un usuario puede tener más de uno.
 *
 * El rótulo que ve la persona lo resuelve el cliente: `ADMINISTRATOR` se
 * muestra como "Administrador".
 */
export const ROLES = ['ADMINISTRATOR', 'LAWYER', 'SECRETARY'] as const;
export type Role = (typeof ROLES)[number];

/**
 * Orden de precedencia para cuando la interfaz muestra un rol solo.
 * Gana el de más peso.
 */
export const ROLE_PRECEDENCE: readonly Role[] = ['ADMINISTRATOR', 'SECRETARY', 'LAWYER'];

/** Fueros con los que trabaja el estudio. */
export const JURISDICTIONS = ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

/**
 * Cómo se cuentan los días de un plazo.
 *
 * `NONE` es para los estados que no abren plazo (`timeLimitDays: 0`). El
 * contrato anterior no tenía cómo expresarlo y obligaba a guardar "0 días
 * hábiles", que no es lo mismo: eso vence hoy, "sin plazo" no vence nunca.
 */
export const DAY_TYPES = ['BUSINESS', 'CONSECUTIVE', 'NONE'] as const;
export type DayType = (typeof DAY_TYPES)[number];

/**
 * Posición que ocupa el cliente en la causa (§2). No es el `Role` de
 * seguridad del usuario.
 */
export const PROCEDURAL_ROLES = [
    'DEFENSA',
    'QUERELLANTE_PARTICULAR',
    'RECURRENTE',
    'ACTORA',
    'DEMANDADA',
] as const;
export type ProceduralRole = (typeof PROCEDURAL_ROLES)[number];

/** Qué roles admite cada fuero. Uno que no corresponde es un `400`. */
export const PROCEDURAL_ROLES_BY_JURISDICTION: Record<Jurisdiction, readonly ProceduralRole[]> = {
    CRIMINAL: ['DEFENSA', 'QUERELLANTE_PARTICULAR'],
    ADMINISTRATIVE: ['DEFENSA', 'RECURRENTE'],
    AMPARO: ['ACTORA', 'DEMANDADA'],
};

/**
 * Origen de un vencimiento en los tableros (V4 §2): el plazo que abrió el acto
 * procesal del estado actual, o el plazo para presentar el amparo desde el
 * acto lesivo (D-78).
 */
export const DEADLINE_KINDS = ['PROCEDURAL_ACT', 'HARMFUL_ACT'] as const;
export type DeadlineKind = (typeof DEADLINE_KINDS)[number];

/**
 * Situación de la carpeta de una causa en la nube (V4 §2). Una causa para la
 * que no se pidió carpeta no tiene estado: su `folder` vale `null`.
 */
export const CASE_FOLDER_STATUSES = ['CREATED', 'PENDING'] as const;
export type CaseFolderStatus = (typeof CASE_FOLDER_STATUSES)[number];

/**
 * Los códigos y las formas de error viven en `api/contract.ts`, que es
 * contrato de producción: lo usa `http.ts` para parsear. Se reexportan acá
 * para que el mock siga teniendo todo el contrato a mano.
 */
import type { ErrorBody, ErrorCode } from '../api/contract';

export {
    isErrorCode,
    ERROR_CODES,
    type ErrorBody,
    type ErrorCode,
    type LoginErrorBody,
} from '../api/contract';

/* ------------------------------------------------------------------ */
/* Recursos (§3)                                                       */
/* ------------------------------------------------------------------ */

/**
 * Una persona referida desde otro recurso: quién registró un acto, quién marcó
 * una causa como prescripta, quién cargó un modelo, el responsable de un plazo.
 * Desde V4 el apellido y los nombres van separados (D-68).
 */
export interface PersonRef {
    id: number;
    lastName: string;
    firstName: string;
}

/**
 * La ficha profesional embebida dentro de un usuario (§3.2).
 *
 * Son los tres campos que la pantalla necesita para dibujar la columna
 * "Abogado vinculado": el id para operar, el nombre para mostrar y la
 * matrícula porque desambigua dos homónimos. No es la ficha completa.
 */
export interface EmbeddedLawyer extends PersonRef {
    registrationNumber: string;
}

/** Usuario tal como lo devuelve `/users` y el login (§3.2). */
export interface User {
    id: number;
    username: string;
    /** Apellido y nombres separados desde V4 (D-68). */
    lastName: string;
    firstName: string;
    email: string;
    /** Siempre arreglo, también en el login. Al menos un rol. */
    roles: Role[];
    /** `null` para un usuario sin ficha profesional (secretaría). */
    lawyer: EmbeddedLawyer | null;
    /** ISO 8601 con offset. `null` si nunca inició sesión. */
    lastLoginAt: string | null;
    /** Estado de alta. La baja es lógica. */
    active: boolean;
}

/** Abogado tal como lo devuelve `/lawyers` (§3.3). */
export interface Lawyer {
    id: number;
    /** Apellido y nombres separados desde V4 (D-68). */
    lastName: string;
    /** Sin el tratamiento: "Dr." o "Dra." lo pone el frontend (D-81). */
    firstName: string;
    /** Matrícula del Colegio de Abogados de Córdoba, formato `1-28114`. */
    registrationNumber: string;
    /** Causas activas donde es responsable. Calculado, sólo lectura. */
    activeCases: number;
    active: boolean;
}

/**
 * Estado procesal tal como lo devuelve un `GET` de `/procedural-states` (§3.4).
 *
 * No tiene posición: los estados no tienen orden dentro del fuero y se listan
 * en el orden en que se registraron (D-31).
 */
export interface ProceduralState {
    id: number;
    /** Texto libre en castellano: lo carga el estudio (RN4). Único por fuero. */
    name: string;
    jurisdiction: Jurisdiction;
    /** Días que abre el estado. `0` = no abre plazo. */
    timeLimitDays: number;
    dayType: DayType;
    /** Cierra el ciclo de vida de la causa (Archivada, Prescripta). */
    terminal: boolean;
    /**
     * Causas que están hoy en este estado, activas o no: también las archivadas
     * y las prescriptas (V4 D-70). No cuenta las dadas de baja. Calculado; sólo
     * en las respuestas de `GET`.
     */
    caseCount: number;
    active: boolean;
}

/**
 * Lo que devuelven `POST` y `PATCH /procedural-states`: el estado sin
 * `caseCount`, que es un dato de consulta (D-32).
 */
export type WrittenProceduralState = Omit<ProceduralState, 'caseCount'>;

/** Calificación legal tal como la devuelve un `GET` de `/legal-qualifications` (§3.5). */
export interface LegalQualification {
    id: number;
    /** Denominación con la norma: `Hurto simple — art. 162 CP`. Única entre las vigentes. */
    name: string;
    /** Plazo de prescripción de la acción, en meses enteros. */
    prescriptionMonths: number;
    /** Causas activas que la registran. Calculado; sólo en las respuestas de `GET`. */
    activeCases: number;
    active: boolean;
}

/** Lo que devuelven `POST` y `PATCH /legal-qualifications`: sin `activeCases` (D-32). */
export type WrittenLegalQualification = Omit<LegalQualification, 'activeCases'>;

/** Cliente tal como lo devuelve `/clients` (§3.6). */
export interface Client {
    id: number;
    lastName: string;
    firstName: string;
    /** Sólo dígitos, sin puntos. Único entre los vigentes. */
    dni: string;
    phone: string | null;
    email: string | null;
    /** Fecha de alta en el estudio, `YYYY-MM-DD`. La asigna el backend. */
    clientSince: string;
    /** Causas activas en las que es cliente. Calculado, sólo lectura. */
    activeCases: number;
    active: boolean;
}

/** El cliente embebido en una causa: sin `activeCases` ni `active` (§3.7). */
export type CaseClient = Omit<Client, 'activeCases' | 'active'>;

/** Una calificación de la causa, con su fecha del hecho y su prescripción (§3.7). */
export interface CaseLegalQualification {
    id: number;
    name: string;
    prescriptionMonths: number;
    /** Fecha del hecho imputado. La carga el usuario. */
    offenseDate: string;
    /**
     * Desde cuándo se computa: la fecha del acto interruptivo más reciente o,
     * si no hay ninguno (o es anterior al hecho), `offenseDate` (V4 §3.9).
     */
    prescriptionStartsOn: string;
    /** `prescriptionStartsOn` más `prescriptionMonths`. */
    prescriptionExpiresOn: string;
}

/**
 * El estado al que un acto lleva la causa: el `resultingState` del acto
 * (§3.8). Nunca es el estado inicial.
 */
export interface CaseState {
    /** `null` si el estado fue escrito a mano (o, en la causa, si es el inicial). */
    proceduralStateId: number | null;
    name: string;
    /** `true` si es un estado escrito a mano para esta causa. */
    custom: boolean;
}

/**
 * El estado procesal actual de una causa, con el vencimiento del acto que la
 * llevó a él (§3.7). Nunca es `null`: toda causa nace en el estado inicial
 * "Iniciada" (D-34), y el vencimiento viaja acá adentro (D-35).
 */
export interface CurrentState extends CaseState {
    /** `true` si es el estado inicial, "Iniciada". */
    initial: boolean;
    /**
     * El acto que llevó la causa a este estado. `null` en el estado inicial y
     * en "Prescripta", al que no se llega por un acto (V4 D-54).
     */
    proceduralActId: number | null;
    /** `null` si el acto no abrió plazo o si es el estado inicial. */
    dueDate: string | null;
    /** `0` vence hoy; negativo, ya vencido. `null` si `dueDate` es `null`. */
    businessDaysRemaining: number | null;
    manuallyAdjusted: boolean;
}

/**
 * La prescripción que rige la causa: la de la calificación que prescribe
 * primero, ya calculada por el backend (V4 §3.7, D-51).
 */
export interface CasePrescription {
    legalQualificationId: number;
    legalQualificationName: string;
    startsOn: string;
    expiresOn: string;
    /** 0 a 100, redondeado al entero más cercano. */
    elapsedPercentage: number;
    /** `true` desde el 70 % transcurrido, evaluado sobre el valor exacto. */
    alert: boolean;
    /** `true` si hoy es igual o posterior a `expiresOn`. No cambia el estado. */
    expired: boolean;
    /** El acto interruptivo que reinició el cómputo. `null` si corre desde el hecho. */
    lastInterruptiveActDate: string | null;
}

/** Constancia de que la causa fue marcada como prescripta (V4 §3.7, HU33). */
export interface PrescriptionDeclaration {
    prescriptionDate: string;
    resolution: string;
    grounds: string | null;
    registeredBy: PersonRef;
    registeredAt: string;
}

/** La carpeta de la causa en la nube (V4 §3.7, HU39 y HU40). */
export interface CaseFolder {
    status: CaseFolderStatus;
    /** `null` mientras está `PENDING`. */
    url: string | null;
    /** `/VZ Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado` (D-61). */
    path: string;
    templatesCopied: number;
    templatesPending: number;
}

/**
 * El vencimiento para presentar el amparo desde el acto lesivo (V4 §3.7,
 * D-78). Sólo existe en un amparo activo que todavía está en "Iniciada".
 */
export interface HarmfulActDeadline {
    /** `harmfulActDate` o, si se renueva, la última renovación que no supera hoy. */
    actDate: string;
    /** `true` si `actDate` es una renovación y no la fecha cargada. */
    renewed: boolean;
    dueDate: string;
    /** `0` vence hoy; negativo, vencido. */
    businessDaysRemaining: number;
}

/** Causa tal como la devuelve `/cases` (§3.7). */
export interface Case {
    id: number;
    /** 8 dígitos. Opcional (D-33); si se informa, único en todo el sistema (RN2). */
    sacNumber: string | null;
    caption: string;
    court: string | null;
    jurisdiction: Jurisdiction;
    proceduralRole: ProceduralRole;
    instructorName: string | null;
    /** Sólo el teléfono: el interno va aparte. */
    tribunalPhone: string | null;
    /** Número de interno del instructor (D-33). */
    instructorExtension: string | null;
    /** `null` en el fuero penal. */
    counterparty: string | null;
    /** Objeto del reclamo o del amparo. `null` en el fuero penal. */
    subjectMatter: string | null;
    /** Si el cliente está preso. Sólo en el penal (V4 D-67, D-80). */
    clientDetained: boolean | null;
    /** Si se hizo lugar a la medida cautelar. Sólo en el amparo. */
    injunctionGranted: boolean | null;
    /** Fecha del acto lesivo. Sólo en el amparo, y opcional. */
    harmfulActDate: string | null;
    harmfulActRenews: boolean | null;
    /** Cada cuántos días corridos se renueva. Sólo si `harmfulActRenews`. */
    harmfulActRenewalDays: number | null;
    /** Plazo para presentar el amparo. Sólo con `harmfulActDate`. */
    harmfulActTermDays: number | null;
    harmfulActTermDayType: DayType | null;
    /** Calculado (D-78). */
    harmfulActDeadline: HarmfulActDeadline | null;
    /** Agotamiento de la vía administrativa. Sólo en el administrativo. */
    administrativeRemedyExhaustedOn: string | null;
    /** Tasa de justicia pagada (RN10). En los tres fueros. */
    courtFeePaid: boolean;
    client: CaseClient;
    responsibleLawyer: EmbeddedLawyer;
    /** Opcional en el penal (D-33); vacío en los demás fueros. */
    legalQualifications: CaseLegalQualification[];
    /** `null` fuera del penal y en una causa penal sin calificaciones (V4). */
    prescription: CasePrescription | null;
    /** `null` mientras la causa no fue marcada como prescripta (V4). */
    prescriptionDeclaration: PrescriptionDeclaration | null;
    /** `null` mientras la causa no tiene SAC (D-38). */
    startDate: string | null;
    currentState: CurrentState;
    /** `null` si no se pidió crearla, o en las causas anteriores a V4. */
    folder: CaseFolder | null;
    active: boolean;
}

/** El plazo que abre un acto. Los valores de la tabla se copian al registrarlo (§3.8). */
export interface ActDeadline {
    timeLimitDays: number;
    dayType: DayType;
    /** `notificationDate` en el fuero administrativo, `actDate` en los demás. */
    countsFrom: string;
    /** Lo que da la tabla. `null` si el estado no abre plazo. */
    computedDueDate: string | null;
    /** El vigente: el calculado o, si se ajustó, el manual. */
    dueDate: string;
    manuallyAdjusted: boolean;
}

/** Acto procesal tal como lo devuelve su registro (§3.8). */
export interface ProceduralAct {
    id: number;
    caseId: number;
    resultingState: CaseState;
    actDate: string;
    /** Sólo en el fuero administrativo (RN6). */
    notificationDate: string | null;
    notes: string | null;
    /** `null` si el acto no abre plazo. */
    deadline: ActDeadline | null;
    registeredBy: PersonRef;
    registeredAt: string;
}

/**
 * Acto interruptivo (V4 §3.9, HU31). Reinicia la prescripción de todas las
 * calificaciones de la causa; no mueve el estado ni abre plazos (D-48, D-49).
 */
export interface InterruptiveAct {
    id: number;
    caseId: number;
    /** Texto libre: "Citación a juicio", "Indagatoria". */
    name: string;
    actDate: string;
    notes: string | null;
    registeredBy: PersonRef;
    registeredAt: string;
}

/** Modelo formal (V4 §3.10, HU34 y HU35). */
export interface DocumentTemplate {
    id: number;
    name: string;
    /** Al menos uno, sin repetir (D-55). */
    jurisdictions: Jurisdiction[];
    fileName: string;
    copyToNewCases: boolean;
    lastVersionAt: string;
    lastVersionBy: PersonRef;
    /** Causas a cuya carpeta se copió. Calculado. */
    usageCount: number;
    active: boolean;
}

/** Los cuatro indicadores de un tablero (V4 §3.11). */
export interface DashboardSummary {
    dueToday: number;
    overdue: number;
    dueSoon: number;
    activeCases: number;
}

/** Un plazo abierto de un tablero. */
export interface DashboardDeadline {
    caseId: number;
    /** De dónde sale el vencimiento: el acto procesal o el acto lesivo (D-78). */
    kind: DeadlineKind;
    sacNumber: string | null;
    caption: string;
    jurisdiction: Jurisdiction;
    currentStateName: string;
    responsibleLawyer: PersonRef;
    dueDate: string;
    businessDaysRemaining: number;
}

/** Una causa penal con el 70 % o más de su prescripción transcurrida (HU32). */
export interface DashboardPrescriptionAlert {
    caseId: number;
    sacNumber: string | null;
    caption: string;
    responsibleLawyer: PersonRef;
    legalQualificationName: string;
    startsOn: string;
    expiresOn: string;
    elapsedPercentage: number;
    expired: boolean;
}

/** "Causas para impulsar": activas y sin ningún vencimiento abierto (CA-41.4). */
export interface DashboardCaseToAdvance {
    caseId: number;
    sacNumber: string | null;
    caption: string;
    jurisdiction: Jurisdiction;
    currentStateName: string;
    lastActDate: string | null;
    daysSinceLastAct: number | null;
}

/** `GET /dashboards/lawyer`: "Mi día" (HU41). */
export interface LawyerDashboard {
    date: string;
    lawyer: PersonRef;
    summary: DashboardSummary;
    deadlines: DashboardDeadline[];
    prescriptionAlerts: DashboardPrescriptionAlert[];
    casesToAdvance: DashboardCaseToAdvance[];
}

/** Un abogado en "Carga del equipo". */
export interface DashboardTeamMember {
    lawyer: PersonRef;
    activeCases: number;
    openDeadlines: { overdue: number; dueToday: number; dueSoon: number; later: number };
}

/** `GET /dashboards/administrator`: "Estudio" (HU42). */
export interface AdministratorDashboard {
    date: string;
    summary: DashboardSummary;
    casesByJurisdiction: { jurisdiction: Jurisdiction; activeCases: number }[];
    deadlines: DashboardDeadline[];
    prescriptionAlerts: DashboardPrescriptionAlert[];
    team: DashboardTeamMember[];
}

/** Respuesta de `GET /cases/{caseId}/procedural-acts/deadline-preview` (§3.8). */
export interface DeadlinePreview {
    proceduralStateId: number;
    timeLimitDays: number;
    dayType: DayType;
    countsFrom: string;
    /** `null` si el estado no abre plazo. */
    dueDate: string | null;
    /** `null` si el estado no abre plazo. */
    businessDaysRemaining: number | null;
}

/* ------------------------------------------------------------------ */
/* Cuerpos de petición                                                 */
/* ------------------------------------------------------------------ */

export interface LoginRequest {
    username: string;
    password: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

/**
 * Alta de usuario (§3.2).
 *
 * `lawyerId` y `lawyer` son **mutuamente excluyentes**: se manda uno de los
 * dos, nunca los dos. Cuando viene `lawyer`, el abogado y el usuario se crean
 * en una sola transacción — si algo falla, no queda ninguno.
 */
export interface CreateUserRequest {
    username: string;
    lastName: string;
    firstName: string;
    email: string;
    password: string;
    roles: Role[];
    /** Vincular un abogado ya registrado. */
    lawyerId?: number;
    /** Registrar un abogado nuevo junto con el usuario. */
    lawyer?: CreateLawyerRequest;
}

/**
 * Edición de usuario. Todos los campos son opcionales, pero hay que mandar
 * al menos uno: un PATCH vacío responde 400.
 *
 * `roles` **reemplaza el conjunto completo**. Para conservar los roles que
 * ya tiene, se omite el campo.
 *
 * `lawyerId: null` desvincula la ficha profesional.
 */
export interface UpdateUserRequest {
    username?: string;
    lastName?: string;
    firstName?: string;
    email?: string;
    roles?: Role[];
    lawyerId?: number | null;
}

/** Alta de abogado (§3.3). Sin el tratamiento en los nombres (D-81). */
export interface CreateLawyerRequest {
    lastName: string;
    firstName: string;
    registrationNumber: string;
}

/** Edición de abogado. Al menos un campo. `activeCases` no es modificable. */
export interface UpdateLawyerRequest {
    lastName?: string;
    firstName?: string;
    registrationNumber?: string;
}

/** Alta de estado procesal (§3.4). */
export interface CreateProceduralStateRequest {
    name: string;
    jurisdiction: Jurisdiction;
    timeLimitDays?: number;
    dayType?: DayType;
    terminal?: boolean;
}

/**
 * Edición de estado procesal. Al menos un campo.
 *
 * Sin `jurisdiction`: un estado no cambia de fuero (V3 D-36). Si viaja, el
 * backend responde `400 VALIDATION_ERROR` sobre ese campo.
 */
export interface UpdateProceduralStateRequest {
    name?: string;
    timeLimitDays?: number;
    dayType?: DayType;
    terminal?: boolean;
}

/** Alta de calificación legal (§3.5). */
export interface CreateLegalQualificationRequest {
    name: string;
    prescriptionMonths: number;
}

/** Edición de calificación legal. Al menos un campo. */
export type UpdateLegalQualificationRequest = Partial<CreateLegalQualificationRequest>;

/** Alta de cliente (§3.6). Teléfono y correo son opcionales. */
export interface CreateClientRequest {
    lastName: string;
    firstName: string;
    dni: string;
    phone?: string;
    email?: string;
}

/** Una calificación en el alta de causa: cuál y cuándo fue el hecho (D-28). */
export interface CaseQualificationRequest {
    legalQualificationId: number;
    offenseDate: string;
}

/**
 * Alta de causa (§3.7).
 *
 * `legalQualifications` va sólo en el fuero penal, y ahí es opcional (D-33);
 * `counterparty` y `subjectMatter`, sólo en los otros dos. Mandar cualquiera
 * donde no corresponde es un `400`.
 */
export interface CreateCaseRequest {
    /** Opcional (D-33). Si se envía, 8 dígitos y único. */
    sacNumber?: string;
    jurisdiction: Jurisdiction;
    caption: string;
    court?: string;
    instructorName?: string;
    tribunalPhone?: string;
    instructorExtension?: string;
    clientId: number;
    proceduralRole: ProceduralRole;
    legalQualifications?: CaseQualificationRequest[];
    counterparty?: string;
    subjectMatter?: string;
    /** Sólo en el penal. Por defecto, `false` (V4 D-67). */
    clientDetained?: boolean;
    /** Sólo en el amparo. Por defecto, `false`. */
    injunctionGranted?: boolean;
    /** Sólo en el amparo. No futura. */
    harmfulActDate?: string;
    harmfulActRenews?: boolean;
    /** Obligatorio si `harmfulActRenews`. */
    harmfulActRenewalDays?: number;
    /** Obligatorio con `harmfulActDate`. */
    harmfulActTermDays?: number;
    /** Obligatorio con `harmfulActDate`: `BUSINESS` o `CONSECUTIVE`. */
    harmfulActTermDayType?: DayType;
    /** Sólo en el administrativo. No futura. */
    administrativeRemedyExhaustedOn?: string;
    /** En los tres fueros. Por defecto, `false`. */
    courtFeePaid?: boolean;
    responsibleLawyerId: number;
    /** Obligatoria con SAC; sin SAC no se informa (D-38). */
    startDate?: string;
    /** Crear la carpeta de la causa en la nube (HU39). Por defecto, `true` (V4 D-59). */
    createFolder?: boolean;
    /** Copiar los modelos del fuero (HU40). Por defecto, igual a `createFolder`. */
    copyTemplates?: boolean;
}

/** Marcar una causa como prescripta (V4 §3.7, HU33). */
export interface DeclarePrescriptionRequest {
    prescriptionDate: string;
    resolution: string;
    grounds?: string;
}

/** Crear o reintentar la carpeta de una causa (V4 §3.7). El cuerpo puede omitirse. */
export interface CreateCaseFolderRequest {
    copyTemplates?: boolean;
}

/** Registrar un acto interruptivo (V4 §3.9). */
export interface CreateInterruptiveActRequest {
    name: string;
    actDate: string;
    notes?: string;
}

/**
 * Registro de un acto procesal (§3.8). `proceduralStateId` y `customState`
 * son excluyentes: va uno de los dos.
 */
export interface CreateProceduralActRequest {
    proceduralStateId?: number;
    customState?: string;
    actDate: string;
    notificationDate?: string;
    manualDueDate?: string;
    notes?: string;
}

/* ------------------------------------------------------------------ */
/* Parámetros de consulta                                              */
/* ------------------------------------------------------------------ */

/** Valores por defecto y límites de paginación (§3). */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 100;

export interface PaginatedQuery {
    page?: number;
    limit?: number;
    search?: string;
}

export interface UsersQuery extends PaginatedQuery {
    role?: Role;
}

export type LawyersQuery = PaginatedQuery;

export interface ProceduralStatesQuery extends PaginatedQuery {
    jurisdiction?: Jurisdiction;
}

export type LegalQualificationsQuery = PaginatedQuery;

export type ClientsQuery = PaginatedQuery;

/**
 * Filtros de `GET /cases` (§3.7). `proceduralStateId`, `customState` y
 * `withoutProceduralActs` son excluyentes entre sí.
 */
export interface CasesQuery extends PaginatedQuery {
    jurisdiction?: Jurisdiction;
    responsibleLawyerId?: number;
    proceduralStateId?: number;
    customState?: string;
    withoutProceduralActs?: boolean;
    clientId?: number;
    openDeadline?: boolean;
}

/** Filtros de `GET /document-templates` (V4 §3.10, D-59). */
export interface DocumentTemplatesQuery extends Omit<PaginatedQuery, 'search'> {
    jurisdiction?: Jurisdiction;
    copyToNewCases?: boolean;
}

export interface DeadlinePreviewQuery {
    proceduralStateId: number;
    actDate: string;
    notificationDate?: string;
}

/* ------------------------------------------------------------------ */
/* Envoltorios de respuesta (§5.1)                                     */
/* ------------------------------------------------------------------ */

/** POST / PATCH / GET de un recurso individual. */
export interface ItemResponse<T> {
    data: T;
}

export interface Pagination {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
}

/** GET de una colección paginada. */
export interface ListResponse<T> {
    data: T[];
    pagination: Pagination;
}

/** Sesión creada por `POST /auth/login`. */
export interface Session {
    accessToken: string;
    tokenType: 'Bearer';
    /** Segundos de vigencia del token. */
    expiresIn: number;
    /**
     * El usuario completo, con la misma forma que devuelve `/users`.
     *
     * Su `lastLoginAt` es el acceso **anterior** a este, no el de ahora: es
     * lo que le sirve a la persona para detectar un ingreso que no hizo.
     */
    user: User;
}

/* `ErrorBody` y `LoginErrorBody` se definen en `api/contract.ts` y se
   reexportan más arriba: son contrato de producción, no del mock. */

/* ------------------------------------------------------------------ */
/* Constructores de cuerpos                                            */
/* ------------------------------------------------------------------ */

export function itemBody<T>(data: T): ItemResponse<T> {
    return { data };
}

export function listBody<T>(data: T[], pagination: Pagination): ListResponse<T> {
    return { data, pagination };
}

export function errorBody(
    code: ErrorCode,
    message: string,
    details: Record<string, string> | { retryAfterSeconds: number } | null = null,
): ErrorBody {
    return { error: { code, message, details } };
}

/** Calcula el bloque `pagination` a partir del total y la página pedida. */
export function buildPagination(totalItems: number, page: number, limit: number): Pagination {
    return {
        page,
        limit,
        totalItems,
        // Una colección vacía tiene 0 páginas, no 1.
        totalPages: Math.ceil(totalItems / limit),
    };
}

/** El rol de más peso de un usuario, o `null` si viene sin roles. */
export function principalRole(roles: Role[]): Role | null {
    return ROLE_PRECEDENCE.find((role) => roles.includes(role)) ?? null;
}

/* ------------------------------------------------------------------ */
/* Renovación del token                                                */
/* ------------------------------------------------------------------ */

/**
 * Lo que viaja adentro del token de acceso.
 *
 * Ojo: **no es el mismo objeto que el `user` del login**, aunque el backend
 * lo devuelva con ese nombre. El abogado es un id suelto, aparecen los
 * permisos y faltan el nombre completo, el correo, el último acceso y el
 * estado de alta. Los roles sí se llaman `roles`, igual que en el login.
 */
export interface SessionPrincipal {
    id: number;
    username: string;
    roles: Role[];
    lawyerId: number | null;
    permissions: string[];
}

/** Respuesta de `POST /auth/refresh`. Todavía no está en el contrato. */
export interface RefreshedSession {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    user: SessionPrincipal;
}

/**
 * Permisos por rol.
 *
 * Es una aproximación del mock: el contrato no publica el catálogo de
 * permisos y ninguna pantalla los usa todavía. Están para que la forma de la
 * respuesta sea la correcta, no para decidir nada.
 */
const PERMISSIONS_BY_ROLE: Record<Role, string[]> = {
    ADMINISTRATOR: [
        'user:manage',
        'lawyer:manage',
        'procedural-state:manage',
        'legal-qualification:manage',
        'case:read',
    ],
    LAWYER: ['case:read', 'case:change-status'],
    SECRETARY: ['case:read', 'client:manage'],
};

/** Los permisos de un usuario, sin repetidos y en orden estable. */
export function permissionsFor(roles: Role[]): string[] {
    const all = roles.flatMap((role) => PERMISSIONS_BY_ROLE[role] ?? []);
    return [...new Set(all)].sort();
}
