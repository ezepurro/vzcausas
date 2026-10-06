/**
 * Base de datos en memoria del mock.
 *
 * Se arma copiando las semillas de `fixtures.ts`, así el servidor falso puede
 * crear, editar y dar de baja sin ensuciar las constantes. Dura lo que dura
 * la pestaña: un F5 vuelve al estado inicial, igual que `resetMockDb()`.
 *
 * ## Lo que se guarda y lo que se calcula
 *
 * La base guarda **identificadores**, no copias: una causa tiene `clientId` y
 * `responsibleLawyerId`, y el estado procesal de un acto es un `stateId`. Los
 * objetos embebidos del contrato se arman al serializar (`toCase`, `toUser`…).
 * Así renombrar un estado o un abogado se refleja solo en todas las causas,
 * que es lo que pide el contrato (§3.4).
 *
 * Tampoco se guarda nada que salga de contar: `activeCases`, el estado actual
 * de una causa y su vencimiento se calculan en cada lectura a partir de los
 * actos. No hay un número que pueda quedar distinto de los datos.
 *
 * El estado inicial "Iniciada" tampoco se guarda (V3 D-34): una causa sin
 * actos está en él, y deja de estarlo con el primero.
 *
 * La única copia deliberada es el **plazo de un acto**: los días y el tipo de
 * día de la tabla se copian al acto cuando se registra, porque cambiar el
 * plazo de un estado no recalcula los vencimientos ya registrados (V3 D-08).
 */

import type {
    ActDeadline,
    Case,
    CaseClient,
    CaseLegalQualification,
    CaseState,
    Client,
    CurrentState,
    EmbeddedLawyer,
    Jurisdiction,
    Lawyer,
    LegalQualification,
    ProceduralAct,
    ProceduralRole,
    ProceduralState,
    User,
} from './contract';
import {
    addBusinessDays,
    addMonths,
    businessDaysUntil,
    computeDueDate,
    subtractBusinessDays,
    todayIso,
} from './calendar';
import {
    CASE_SEEDS,
    CLIENTS,
    CREDENTIALS,
    DEFAULT_PASSWORD,
    INITIAL_STATE_NAME,
    LAWYERS,
    LEGAL_QUALIFICATIONS,
    PROCEDURAL_STATES,
    TOKEN_PREFIX,
    USERS,
    type ActSeed,
    type SeedDate,
    type StoredClient,
    type StoredLegalQualification,
    type StoredProceduralState,
    type StoredUser,
} from './fixtures';

/* ------------------------------------------------------------------ */
/* Formas guardadas                                                    */
/* ------------------------------------------------------------------ */

/** Una calificación de la causa: cuál es y cuándo fue el hecho. */
export interface StoredCaseQualification {
    legalQualificationId: number;
    offenseDate: string;
}

/** Cómo guarda la base una causa: con ids, sin nada embebido ni calculado. */
export interface StoredCase {
    id: number;
    /** `null` si la causa se registró sin SAC (D-33). */
    sacNumber: string | null;
    caption: string;
    court: string | null;
    jurisdiction: Jurisdiction;
    proceduralRole: ProceduralRole;
    instructorName: string | null;
    instructorPhone: string | null;
    instructorExtension: string | null;
    counterparty: string | null;
    subjectMatter: string | null;
    clientId: number;
    responsibleLawyerId: number;
    qualifications: StoredCaseQualification[];
    startDate: string;
    active: boolean;
}

/**
 * Cómo guarda la base un acto procesal. El estado resultante es uno de dos:
 * `proceduralStateId` (de la tabla del fuero) o `customState` (escrito a mano).
 */
export interface StoredAct {
    id: number;
    caseId: number;
    proceduralStateId: number | null;
    customState: string | null;
    actDate: string;
    notificationDate: string | null;
    notes: string | null;
    /** Copiado de la tabla al registrar. `null` si el acto no abre plazo. */
    deadline: ActDeadline | null;
    /** Id del usuario que lo registró. */
    registeredById: number;
    registeredAt: string;
}

export interface MockDb {
    /** Guardan `lawyerId`; el objeto `lawyer` se arma al serializar. */
    users: StoredUser[];
    lawyers: Lawyer[];
    /** Sin el estado inicial "Iniciada", que es de sistema y no se guarda. */
    proceduralStates: StoredProceduralState[];
    legalQualifications: StoredLegalQualification[];
    clients: StoredClient[];
    cases: StoredCase[];
    proceduralActs: StoredAct[];
    /** `username` → contraseña en texto plano. Es un mock, no un backend. */
    passwords: Map<string, string>;
    /** Tokens vivos: `accessToken` → `userId`. El logout borra la entrada. */
    sessions: Map<string, number>;
    /**
     * Tokens emitidos que ya "vencieron".
     *
     * El mock no mide el tiempo: el vencimiento se provoca a mano con
     * `expireIssuedTokens()`. El token sigue en `sessions` —la sesión no se
     * cerró, sólo caducó el acceso— y por eso todavía sirve para renovar.
     */
    expiredTokens: Set<string>;
    nextUserId: number;
    nextLawyerId: number;
    nextProceduralStateId: number;
    nextLegalQualificationId: number;
    nextClientId: number;
    nextCaseId: number;
    nextProceduralActId: number;
    /** Sufijo incremental para que dos logins no devuelvan el mismo token. */
    issuedTokens: number;
}

/* ------------------------------------------------------------------ */
/* Armado de las semillas                                              */
/* ------------------------------------------------------------------ */

/** Una fecha de semilla → `YYYY-MM-DD`, resolviendo las relativas contra hoy. */
function resolveSeedDate(date: SeedDate, today: string): string {
    return typeof date === 'string' ? date : subtractBusinessDays(today, date.businessDaysAgo);
}

/**
 * El plazo que abre un acto, con la misma cuenta que usa el servidor falso al
 * registrarlo (V3 §3.8, "Cómputo del vencimiento").
 *
 * Vive acá y no en `handlers.ts` porque lo necesitan los dos: las semillas se
 * arman con esta función, así un acto sembrado tiene exactamente el
 * vencimiento que tendría si se lo registrara por la API.
 */
export function buildActDeadline(input: {
    /** El estado de la tabla, o `null` si es un estado escrito a mano. */
    state: Pick<ProceduralState, 'timeLimitDays' | 'dayType'> | null;
    jurisdiction: Jurisdiction;
    actDate: string;
    notificationDate: string | null;
    manualDueDate: string | null;
}): ActDeadline | null {
    const timeLimitDays = input.state?.timeLimitDays ?? 0;
    const dayType = input.state?.dayType ?? 'NONE';

    // En el administrativo el plazo corre desde la notificación (RN6). Si el
    // estado no abre plazo puede no haberla: ahí cuenta desde el acto.
    const countsFrom =
        input.jurisdiction === 'ADMINISTRATIVE' && input.notificationDate
            ? input.notificationDate
            : input.actDate;

    const computedDueDate = computeDueDate(countsFrom, timeLimitDays, dayType);
    const dueDate = input.manualDueDate ?? computedDueDate;
    if (dueDate === null) return null;

    return {
        timeLimitDays,
        dayType,
        countsFrom,
        computedDueDate,
        dueDate,
        manuallyAdjusted: input.manualDueDate !== null,
    };
}

function seedAct(
    seed: ActSeed,
    id: number,
    stored: StoredCase,
    registeredById: number,
    today: string,
): StoredAct {
    const custom = typeof seed.state === 'string';
    const state = custom ? null : PROCEDURAL_STATES.find((s) => s.id === seed.state);
    if (!custom && !state) {
        throw new Error(`[mock] La causa ${stored.id} apunta al estado ${String(seed.state)}, que no existe.`);
    }

    const actDate = resolveSeedDate(seed.on, today);
    const notificationDate = seed.notifiedOn ? resolveSeedDate(seed.notifiedOn, today) : null;
    const manualDueDate =
        seed.manualDueInBusinessDays === undefined
            ? null
            : addBusinessDays(today, seed.manualDueInBusinessDays);

    return {
        id,
        caseId: stored.id,
        proceduralStateId: custom ? null : (seed.state as number),
        customState: custom ? (seed.state as string) : null,
        actDate,
        notificationDate,
        notes: seed.notes ?? null,
        deadline: buildActDeadline({
            state: state ?? null,
            jurisdiction: stored.jurisdiction,
            actDate,
            notificationDate,
            manualDueDate,
        }),
        registeredById,
        registeredAt: `${actDate}T10:00:00-03:00`,
    };
}

function initialState(): MockDb {
    const users = USERS.map((u) => ({ ...u, roles: [...u.roles] }));
    const passwords = new Map<string, string>();
    for (const user of users) {
        passwords.set(user.username, CREDENTIALS[user.username] ?? DEFAULT_PASSWORD);
    }

    /* Las fechas relativas de las semillas se resuelven contra el día en que
       se arma la base. Un test que fije el reloj tiene que llamar a
       `resetMockDb()` después de hacerlo. */
    const today = todayIso();

    const cases: StoredCase[] = [];
    const proceduralActs: StoredAct[] = [];

    for (const seed of CASE_SEEDS) {
        const stored: StoredCase = {
            id: seed.id,
            sacNumber: seed.sacNumber,
            caption: seed.caption,
            court: seed.court,
            jurisdiction: seed.jurisdiction,
            proceduralRole: seed.proceduralRole,
            instructorName: seed.instructorName,
            instructorPhone: seed.instructorPhone,
            instructorExtension: seed.instructorExtension,
            counterparty: seed.counterparty ?? null,
            subjectMatter: seed.subjectMatter ?? null,
            clientId: seed.clientId,
            responsibleLawyerId: seed.responsibleLawyerId,
            qualifications: (seed.qualifications ?? []).map((q) => ({ ...q })),
            startDate: resolveSeedDate(seed.startDate, today),
            active: true,
        };
        cases.push(stored);

        // Los actos los registró quien lleva la causa: sólo el abogado
        // responsable lo hace (D-30), y la cuenta sale de su ficha.
        const registeredBy = users.find((u) => u.lawyerId === seed.responsibleLawyerId);
        if (!registeredBy) {
            throw new Error(`[mock] El abogado ${seed.responsibleLawyerId} de la causa ${seed.id} no tiene usuario.`);
        }
        for (const act of seed.acts) {
            proceduralActs.push(seedAct(act, proceduralActs.length + 1, stored, registeredBy.id, today));
        }
    }

    return {
        users,
        lawyers: LAWYERS.map((l) => ({ ...l })),
        proceduralStates: PROCEDURAL_STATES.map((s) => ({ ...s })),
        legalQualifications: LEGAL_QUALIFICATIONS.map((q) => ({ ...q })),
        clients: CLIENTS.map((c) => ({ ...c })),
        cases,
        proceduralActs,
        passwords,
        sessions: new Map(),
        expiredTokens: new Set(),
        nextUserId: Math.max(...USERS.map((u) => u.id)) + 1,
        nextLawyerId: Math.max(...LAWYERS.map((l) => l.id)) + 1,
        nextProceduralStateId: Math.max(...PROCEDURAL_STATES.map((s) => s.id)) + 1,
        nextLegalQualificationId: Math.max(...LEGAL_QUALIFICATIONS.map((q) => q.id)) + 1,
        nextClientId: Math.max(...CLIENTS.map((c) => c.id)) + 1,
        nextCaseId: Math.max(...CASE_SEEDS.map((c) => c.id)) + 1,
        nextProceduralActId: proceduralActs.length + 1,
        issuedTokens: 0,
    };
}

/** Instancia única. Los handlers la leen y la escriben directo. */
export const db: MockDb = initialState();

/**
 * Vuelve la base al estado semilla.
 *
 * Pensado para el `beforeEach` de un test o para un botón "reiniciar datos"
 * de desarrollo. Muta la instancia en vez de reemplazarla para que quien ya
 * importó `db` siga viendo lo mismo.
 *
 * Los actos de las semillas se ubican respecto de **hoy**, así que cada
 * llamada los recalcula con la fecha del momento.
 */
export function resetMockDb(): void {
    Object.assign(db, initialState());
}

/* ------------------------------------------------------------------ */
/* Causas: estado actual, vencimiento y causa activa                   */
/* ------------------------------------------------------------------ */

/** Los actos de una causa, del más viejo al más nuevo. */
export function actsOf(caseId: number): StoredAct[] {
    return db.proceduralActs
        .filter((a) => a.caseId === caseId)
        // A igual fecha de acto, manda el que se registró después.
        .sort((a, b) => a.actDate.localeCompare(b.actDate) || a.id - b.id);
}

/**
 * El acto que define el estado de la causa: el de **fecha de acto más
 * reciente** (V3 D-14). `undefined` si la causa todavía no tiene actos: está
 * en el estado inicial.
 *
 * Por eso cargar un acto viejo —al completar la historia de una causa— no
 * retrocede el estado ni reemplaza el vencimiento vigente.
 */
export function latestActOf(caseId: number): StoredAct | undefined {
    return actsOf(caseId).at(-1);
}

/** El estado al que llevó un acto, con la denominación vigente del estado. */
export function stateOfAct(act: StoredAct): CaseState {
    if (act.proceduralStateId === null) {
        return { proceduralStateId: null, name: act.customState ?? '', custom: true };
    }
    // Se busca también entre los dados de baja: la causa que quedó en un
    // estado eliminado lo sigue mostrando (§4 "Bajas").
    const state = db.proceduralStates.find((s) => s.id === act.proceduralStateId);
    return { proceduralStateId: act.proceduralStateId, name: state?.name ?? '', custom: false };
}

/** `true` si el estado actual de la causa cierra su ciclo de vida. */
export function isInTerminalState(caseId: number): boolean {
    const act = latestActOf(caseId);
    if (!act || act.proceduralStateId === null) return false;
    return db.proceduralStates.find((s) => s.id === act.proceduralStateId)?.terminal === true;
}

/**
 * Causa activa (§4): no fue dada de baja y su estado actual no es terminal.
 * Una causa en el estado inicial y una en un estado escrito a mano son activas.
 */
export function isActiveCase(stored: StoredCase): boolean {
    return stored.active && !isInTerminalState(stored.id);
}

function activeCases(): StoredCase[] {
    return db.cases.filter(isActiveCase);
}

/* ------------------------------------------------------------------ */
/* Serialización                                                       */
/* ------------------------------------------------------------------ */

/**
 * Convierte el usuario guardado en el recurso que define el contrato.
 *
 * La base guarda `lawyerId` y acá se resuelve el objeto embebido. Hacerlo al
 * serializar y no al guardar tiene una ventaja concreta: si alguien edita el
 * nombre del abogado, los usuarios vinculados lo reflejan solos, sin tener
 * que salir a actualizar copias.
 */
export function toUser(stored: StoredUser): User {
    return {
        id: stored.id,
        username: stored.username,
        fullName: stored.fullName,
        email: stored.email,
        roles: [...stored.roles],
        lawyer: embedLawyer(stored.lawyerId),
        lastLoginAt: stored.lastLoginAt,
        active: stored.active,
    };
}

/** Los tres campos del abogado que el contrato embebe en un usuario y en una causa. */
function embedLawyer(lawyerId: number | null): EmbeddedLawyer | null {
    if (lawyerId === null) return null;
    const lawyer = db.lawyers.find((l) => l.id === lawyerId);
    if (!lawyer) return null;
    return {
        id: lawyer.id,
        fullName: lawyer.fullName,
        registrationNumber: lawyer.registrationNumber,
    };
}

/** El abogado con sus causas activas como responsable. */
export function toLawyer(stored: Lawyer): Lawyer {
    return {
        ...stored,
        activeCases: activeCases().filter((c) => c.responsibleLawyerId === stored.id).length,
    };
}

/**
 * El estado procesal como lo devuelve un `GET`: con las causas activas que
 * están hoy en él. Un estado terminal devuelve siempre `0`: una causa en
 * estado terminal no es activa.
 *
 * `POST` y `PATCH` no pasan por acá: devuelven el estado sin `activeCases`
 * (V3 D-32).
 */
export function toProceduralState(stored: StoredProceduralState): ProceduralState {
    return {
        ...stored,
        activeCases: activeCases().filter(
            (c) => latestActOf(c.id)?.proceduralStateId === stored.id,
        ).length,
    };
}

/**
 * La calificación legal como la devuelve un `GET`: con las causas activas que
 * la registran. `POST` y `PATCH` la devuelven sin `activeCases` (V3 D-32).
 */
export function toLegalQualification(stored: StoredLegalQualification): LegalQualification {
    return {
        ...stored,
        activeCases: activeCases().filter((c) =>
            c.qualifications.some((q) => q.legalQualificationId === stored.id),
        ).length,
    };
}

/** El cliente con las causas activas en las que es cliente. */
export function toClient(stored: StoredClient): Client {
    return {
        ...stored,
        activeCases: activeCases().filter((c) => c.clientId === stored.id).length,
    };
}

/** Lo que una causa embebe de su cliente. */
function embedClient(clientId: number): CaseClient {
    const client = db.clients.find((c) => c.id === clientId);
    if (!client) throw new Error(`[mock] La causa apunta al cliente ${clientId}, que no existe.`);
    return {
        id: client.id,
        lastName: client.lastName,
        firstName: client.firstName,
        dni: client.dni,
        phone: client.phone,
        email: client.email,
        clientSince: client.clientSince,
    };
}

/**
 * Una calificación de la causa, con su prescripción.
 *
 * El nombre y los meses salen de la tabla en cada lectura, también si la
 * calificación fue dada de baja: por eso cambiar `prescriptionMonths` recalcula
 * la prescripción de las causas que la registran (D-08). Hoy
 * `prescriptionStartsOn` es la fecha del hecho; cuando existan los actos
 * interruptivos (HU31) será la del último (D-19).
 */
function embedQualification(stored: StoredCaseQualification): CaseLegalQualification {
    const qualification = db.legalQualifications.find((q) => q.id === stored.legalQualificationId);
    if (!qualification) {
        throw new Error(`[mock] La causa apunta a la calificación ${stored.legalQualificationId}, que no existe.`);
    }
    const prescriptionStartsOn = stored.offenseDate;
    return {
        id: qualification.id,
        name: qualification.name,
        prescriptionMonths: qualification.prescriptionMonths,
        offenseDate: stored.offenseDate,
        prescriptionStartsOn,
        prescriptionExpiresOn: addMonths(prescriptionStartsOn, qualification.prescriptionMonths),
    };
}

/**
 * El estado actual de la causa, con su vencimiento (V3 D-34 y D-35).
 *
 * Sin actos, la causa está en el estado inicial: "Iniciada", sin acto que la
 * haya llevado ahí y sin vencimiento. Con actos, el estado y el vencimiento
 * son los del acto de fecha más reciente.
 */
function currentStateOf(caseId: number): CurrentState {
    const act = latestActOf(caseId);
    if (!act) {
        return {
            proceduralStateId: null,
            name: INITIAL_STATE_NAME,
            custom: false,
            initial: true,
            proceduralActId: null,
            dueDate: null,
            businessDaysRemaining: null,
            manuallyAdjusted: false,
        };
    }

    // Un plazo vencido sigue vigente hasta que otro acto mueva la causa. Lo
    // que no tiene vencimiento es una causa en estado terminal.
    const deadline = isInTerminalState(caseId) ? null : act.deadline;
    return {
        ...stateOfAct(act),
        initial: false,
        proceduralActId: act.id,
        dueDate: deadline?.dueDate ?? null,
        businessDaysRemaining: deadline ? businessDaysUntil(deadline.dueDate) : null,
        manuallyAdjusted: deadline?.manuallyAdjusted ?? false,
    };
}

/** La causa tal como la define el contrato, con todo lo embebido y lo calculado. */
export function toCase(stored: StoredCase): Case {
    const lawyer = embedLawyer(stored.responsibleLawyerId);
    if (!lawyer) {
        throw new Error(`[mock] La causa ${stored.id} apunta al abogado ${stored.responsibleLawyerId}, que no existe.`);
    }

    return {
        id: stored.id,
        sacNumber: stored.sacNumber,
        caption: stored.caption,
        court: stored.court,
        jurisdiction: stored.jurisdiction,
        proceduralRole: stored.proceduralRole,
        instructorName: stored.instructorName,
        instructorPhone: stored.instructorPhone,
        instructorExtension: stored.instructorExtension,
        counterparty: stored.counterparty,
        subjectMatter: stored.subjectMatter,
        client: embedClient(stored.clientId),
        responsibleLawyer: lawyer,
        legalQualifications: stored.qualifications.map(embedQualification),
        startDate: stored.startDate,
        currentState: currentStateOf(stored.id),
        active: stored.active,
    };
}

/** El acto procesal tal como lo devuelve su registro. */
export function toProceduralAct(stored: StoredAct): ProceduralAct {
    const author = db.users.find((u) => u.id === stored.registeredById);
    return {
        id: stored.id,
        caseId: stored.caseId,
        resultingState: stateOfAct(stored),
        actDate: stored.actDate,
        notificationDate: stored.notificationDate,
        notes: stored.notes,
        deadline: stored.deadline ? { ...stored.deadline } : null,
        registeredBy: { id: stored.registeredById, fullName: author?.fullName ?? '' },
        registeredAt: stored.registeredAt,
    };
}

/* ------------------------------------------------------------------ */
/* Sesiones                                                            */
/* ------------------------------------------------------------------ */

/** Emite un token para el usuario y lo registra como sesión activa. */
export function issueToken(userId: number): string {
    db.issuedTokens += 1;
    const token = `${TOKEN_PREFIX}.mock-${userId}-${db.issuedTokens}`;
    db.sessions.set(token, userId);
    return token;
}

/**
 * Usuario dueño de un token vivo, o `undefined` si el token no sirve.
 *
 * Un usuario dado de baja no tiene sesión válida aunque conserve el token:
 * la baja lógica le saca el acceso, no sólo lo esconde de los listados.
 */
export function userFromToken(token: string | undefined): StoredUser | undefined {
    if (!token) return undefined;
    if (db.expiredTokens.has(token)) return undefined;
    const userId = db.sessions.get(token);
    if (userId === undefined) return undefined;
    const user = db.users.find((u) => u.id === userId);
    return user?.active ? user : undefined;
}

/** Cierra una sesión. Devuelve `false` si el token ya no existía. */
export function revokeToken(token: string): boolean {
    db.expiredTokens.delete(token);
    return db.sessions.delete(token);
}

/**
 * Usuario habilitado a renovar con este token.
 *
 * A diferencia de `userFromToken`, acepta un token vencido: de eso se trata
 * renovar. Lo que no acepta es un token revocado por un logout, ni el de un
 * usuario dado de baja.
 *
 * En el backend real la credencial de la renovación es la cookie `httpOnly`,
 * no el token de acceso. El mock no puede emitir esa cookie desde un service
 * worker, así que usa el token vencido como sustituto. Es la única libertad
 * que se toma acá, y no cambia nada de lo que el frontend tiene que resolver.
 */
export function userForRenewal(token: string | undefined): StoredUser | undefined {
    if (!token) return undefined;
    const userId = db.sessions.get(token);
    if (userId === undefined) return undefined;
    const user = db.users.find((u) => u.id === userId);
    return user?.active ? user : undefined;
}

/**
 * Vence todos los tokens vivos, como si hubieran pasado los quince minutos.
 *
 * Es la forma de probar la renovación sin esperar. Desde la consola:
 *
 * ```ts
 * const { expireIssuedTokens } = await import('/src/shared/mocks/index.ts')
 * expireIssuedTokens()
 * ```
 *
 * A partir de ahí, el siguiente pedido a cualquier pantalla responde 401 y
 * el frontend tiene que renovar solo, sin que el usuario note nada.
 */
export function expireIssuedTokens(): number {
    for (const token of db.sessions.keys()) db.expiredTokens.add(token);
    return db.expiredTokens.size;
}

/** Cierra todas las sesiones abiertas de un usuario. */
export function revokeUserSessions(userId: number): void {
    for (const [token, id] of db.sessions) {
        if (id === userId) db.sessions.delete(token);
    }
}
