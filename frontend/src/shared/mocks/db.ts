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
    CaseDocument,
    CaseFolder,
    CaseFolderStatus,
    CaseLegalQualification,
    CasePrescription,
    CaseState,
    Client,
    CurrentState,
    DayType,
    DocumentTemplate,
    EmbeddedLawyer,
    HarmfulActDeadline,
    InterruptiveAct,
    Jurisdiction,
    Lawyer,
    LegalQualification,
    ProceduralAct,
    ProceduralRole,
    PersonRef,
    ProceduralState,
    User,
} from './contract';
import {
    addBusinessDays,
    addCalendarDays,
    addMonths,
    businessDaysUntil,
    calendarDaysBetween,
    computeDueDate,
    subtractBusinessDays,
    todayIso,
} from './calendar';
import {
    CASE_SEEDS,
    CLIENTS,
    CREDENTIALS,
    DEFAULT_PASSWORD,
    DOCUMENT_SEEDS,
    DOCUMENT_TEMPLATES,
    INITIAL_STATE_NAME,
    LAWYERS,
    LEGAL_QUALIFICATIONS,
    PRESCRIBED_STATE_ID,
    PROCEDURAL_STATES,
    TOKEN_PREFIX,
    USERS,
    type ActSeed,
    type CaseSeed,
    type SeedDate,
    type StoredClient,
    type StoredDocumentTemplate,
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
    tribunalPhone: string | null;
    instructorExtension: string | null;
    counterparty: string | null;
    subjectMatter: string | null;
    /** Los datos propios de cada fuero (V4 D-67): `null` fuera de su fuero. */
    clientDetained: boolean | null;
    injunctionGranted: boolean | null;
    harmfulActDate: string | null;
    harmfulActRenews: boolean | null;
    harmfulActRenewalDays: number | null;
    harmfulActTermDays: number | null;
    harmfulActTermDayType: DayType | null;
    administrativeRemedyExhaustedOn: string | null;
    courtFeePaid: boolean;
    clientId: number;
    responsibleLawyerId: number;
    qualifications: StoredCaseQualification[];
    /** `null` mientras la causa no tiene SAC (D-38). */
    startDate: string | null;
    /** `null` si no se pidió (V4 §3.7). */
    folder: StoredFolder | null;
    /** La marca de HU33. Con ella la causa está en "Prescripta" (D-54). */
    prescriptionDeclaration: StoredPrescriptionDeclaration | null;
    active: boolean;
    /**
     * La baja (V5, HU21): motivo, quién y cuándo. Queda en la auditoría y la
     * API no la devuelve, porque para el cliente la causa deja de existir.
     */
    deactivation: { reason: string | null; byId: number; at: string } | null;
}

/**
 * Un archivo de la carpeta de la causa en Drive (V5 §3.12). La API no lo
 * guarda —lo lee de Drive en cada pedido—; el mock hace de Drive.
 */
export interface StoredDocument {
    id: string;
    caseId: number;
    name: string;
    mimeType: string;
    sizeBytes: number | null;
    createdAt: string;
    modifiedAt: string;
    uploadedBy: string | null;
    /**
     * Sólo en un expediente generado: su número, su versión, el nombre de sus
     * partes y lo que el cliente mandó para la carátula, para armar el PDF.
     */
    caseFile: {
        id: number;
        version: number;
        parts: string[];
        cover: { opposingParty: string | null; notes: string | null } | null;
    } | null;
}

/**
 * La carpeta de la causa, tal como se devuelve, más si se pidió copiar los
 * modelos: lo necesita el reintento para saber qué le falta.
 */
export interface StoredFolder extends CaseFolder {
    copyTemplates: boolean;
}

/** La marca de prescripción, con el id de quien la registró. */
export interface StoredPrescriptionDeclaration {
    prescriptionDate: string;
    resolution: string;
    grounds: string | null;
    registeredById: number;
    registeredAt: string;
}

/** Un acto interruptivo (V4 §3.9), con el id de quien lo registró. */
export interface StoredInterruptiveAct {
    id: number;
    caseId: number;
    name: string;
    actDate: string;
    notes: string | null;
    registeredById: number;
    registeredAt: string;
}

/**
 * Servicios externos que se pueden "caer" a mano, para probar los `502` y la
 * carpeta pendiente (V4 D-60, D-65). Vuelve a `false` con `resetMockDb()`.
 *
 * ```ts
 * db.failures.documentStorage = true   // Drive no responde
 * ```
 */
export interface MockFailures {
    documentStorage: boolean;
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
    /** La última modificación (V5, HU28). `null` si nunca se modificó. */
    lastModifiedById: number | null;
    lastModifiedAt: string | null;
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
    interruptiveActs: StoredInterruptiveAct[];
    documentTemplates: StoredDocumentTemplate[];
    /** Lo que hay en las carpetas de las causas en Drive (V5 §3.12). */
    documents: StoredDocument[];
    /**
     * La última versión de expediente de cada causa. La lleva el sistema, así
     * que borrar un expediente en Drive no reutiliza su número (V5 D-102).
     */
    caseFileVersions: Map<number, number>;
    nextCaseFileId: number;
    failures: MockFailures;
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
    /**
     * Fallos de login consecutivos por `username`, para simular el bloqueo
     * progresivo de V3 §4 (Límite de frecuencia). Se borra la entrada en un
     * login exitoso; no hay escalera de espera como en el backend real, sólo
     * el umbral de 5 que dispara `TOO_MANY_LOGIN_ATTEMPTS` — alcanza para
     * probar la pantalla, y una escalera completa en un mock que no mide el
     * tiempo sería simular lo que no se puede simular.
     */
    loginAttempts: Map<string, number>;
    nextUserId: number;
    nextLawyerId: number;
    nextProceduralStateId: number;
    nextLegalQualificationId: number;
    nextClientId: number;
    nextCaseId: number;
    nextProceduralActId: number;
    nextInterruptiveActId: number;
    nextDocumentTemplateId: number;
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
        manualTimeLimitDays: manualTimeLimitDays(countsFrom, input.manualDueDate, dayType),
    };
}

/**
 * Los días del plazo que da el vencimiento manual (V4 D-86), contados según
 * `dayType` desde `countsFrom` (excluido). `null` sin ajuste o sin tipo de día.
 */
function manualTimeLimitDays(countsFrom: string, manualDueDate: string | null, dayType: DayType): number | null {
    if (manualDueDate === null) return null;
    switch (dayType) {
        case 'BUSINESS': return businessDaysUntil(manualDueDate, countsFrom);
        case 'CONSECUTIVE': return calendarDaysBetween(countsFrom, manualDueDate);
        case 'NONE': return null;
    }
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
        lastModifiedById: null,
        lastModifiedAt: null,
    };
}

/**
 * Los datos propios del fuero de una causa semilla (V4 D-67), con `null` en
 * los que no le corresponden: es lo que devuelve la API.
 */
function jurisdictionData(seed: CaseSeed, today: string) {
    const amparo = seed.jurisdiction === 'AMPARO';
    const harmful = amparo ? seed.harmfulAct : undefined;
    return {
        clientDetained: seed.jurisdiction === 'CRIMINAL' ? (seed.clientDetained ?? false) : null,
        injunctionGranted: amparo ? (seed.injunctionGranted ?? false) : null,
        harmfulActDate: harmful?.date ?? null,
        harmfulActRenews: amparo ? harmful?.renewalDays !== undefined : null,
        harmfulActRenewalDays: harmful?.renewalDays ?? null,
        harmfulActTermDays: harmful?.termDays ?? null,
        harmfulActTermDayType: harmful?.termDayType ?? null,
        administrativeRemedyExhaustedOn:
            seed.jurisdiction === 'ADMINISTRATIVE' && seed.administrativeRemedyExhaustedOn
                ? resolveSeedDate(seed.administrativeRemedyExhaustedOn, today)
                : null,
    };
}

/* ------------------------------------------------------------------ */
/* Carpeta de la causa (V4 §4, "Carpeta de la causa")                  */
/* ------------------------------------------------------------------ */

const JURISDICTION_LABEL: Record<Jurisdiction, string> = {
    CRIMINAL: 'Penal',
    ADMINISTRATIVE: 'Administrativo',
    AMPARO: 'Amparo',
};

/**
 * El nombre de una carpeta en Drive (V5 §4): sin los caracteres que la nube no
 * admite, con los espacios repetidos juntados y cortado en 255.
 * `GÓMEZ, Ariel c/ PÉREZ` queda `GÓMEZ, Ariel c PÉREZ`.
 */
function driveFolderName(name: string): string {
    // eslint-disable-next-line no-control-regex
    return name.replace(/[/\\:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 255);
}

/**
 * Dónde queda la carpeta: `/VZ Causas/Causas/{abogado}/{fuero}/{carátula}`
 * (V5 §4, "Carpeta de la causa"), con el abogado responsable como
 * `Apellido, Nombres`, el rótulo del fuero y la carátula. Sigue al responsable
 * y a la carátula vigentes (D-104).
 */
export function folderPath(input: {
    lawyer: Pick<Lawyer, 'lastName' | 'firstName'>;
    jurisdiction: Jurisdiction;
    caption: string;
}): string {
    const lawyer = driveFolderName(`${input.lawyer.lastName}, ${input.lawyer.firstName}`);
    return `/VZ Causas/Causas/${lawyer}/${JURISDICTION_LABEL[input.jurisdiction]}/${driveFolderName(input.caption)}`;
}

/** Dónde tendría que estar hoy la carpeta de la causa, con su responsable y su carátula vigentes. */
export function expectedFolderPath(stored: Pick<StoredCase, 'responsibleLawyerId' | 'jurisdiction' | 'caption'>): string {
    const lawyer = db.lawyers.find((l) => l.id === stored.responsibleLawyerId) ?? { lastName: '', firstName: '' };
    return folderPath({ lawyer, jurisdiction: stored.jurisdiction, caption: stored.caption });
}

/* ------------------------------------------------------------------ */
/* Documentos de la carpeta (V5 §3.12)                                 */
/* ------------------------------------------------------------------ */

export const PDF_MIME = 'application/pdf';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME = 'application/msword';
export const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';

/** Lo que admite el expediente: PDF, Word, documento de Google, JPG o PNG (V5 D-102). */
const CONVERTIBLE_MIMES = new Set([PDF_MIME, DOCX_MIME, DOC_MIME, GOOGLE_DOC_MIME, 'image/jpeg', 'image/png']);

/** Lo que el contrato llama documento nativo de Google: Drive no lo mide ni le pone extensión. */
export function isGoogleNative(mimeType: string): boolean {
    return mimeType.startsWith('application/vnd.google-apps.');
}

/** Quien sube lo que genera el sistema: la cuenta de gestión, como la ve Drive. */
export const SYSTEM_UPLOADER = 'VZ Causas';

/** El documento como lo devuelve la API: con su extensión, su enlace y si entra al expediente. */
export function toCaseDocument(stored: StoredDocument): CaseDocument {
    const native = isGoogleNative(stored.mimeType);
    const dot = stored.name.lastIndexOf('.');
    return {
        id: stored.id,
        name: stored.name,
        extension: native || dot < 1 ? null : stored.name.slice(dot + 1).toLowerCase(),
        mimeType: stored.mimeType,
        sizeBytes: native ? null : stored.sizeBytes,
        createdAt: stored.createdAt,
        modifiedAt: stored.modifiedAt,
        uploadedBy: stored.uploadedBy,
        url: `https://drive.google.com/file/d/${stored.id}/view`,
        convertibleToPdf: CONVERTIBLE_MIMES.has(stored.mimeType),
        caseFile: stored.caseFile ? { id: stored.caseFile.id, version: stored.caseFile.version } : null,
    };
}

/**
 * Las copias de los modelos que quedan en una carpeta recién creada (V4 §4,
 * "Qué modelos se copian"). Las usa la base al sembrar y el servidor al crear
 * la carpeta, así una carpeta nueva se lee igual que una sembrada.
 */
export function templateCopies(
    caseId: number,
    templates: readonly StoredDocumentTemplate[],
    jurisdiction: Jurisdiction,
    at: string,
): StoredDocument[] {
    return templatesForNewCases(templates, jurisdiction).map((t) => ({
        id: `vz-${caseId}-modelo-${t.id}`,
        caseId,
        name: t.fileName,
        mimeType: DOCX_MIME,
        sizeBytes: 24_576,
        createdAt: at,
        modifiedAt: at,
        uploadedBy: SYSTEM_UPLOADER,
        caseFile: null,
    }));
}

/** El enlace falso de la carpeta en Drive. */
export function folderUrl(caseId: number): string {
    return `https://drive.google.com/drive/folders/vz-causa-${caseId}`;
}

/**
 * Los modelos que se copian a una causa nueva del fuero: vigentes, que
 * incluyen el fuero y con `copyToNewCases` en `true` (V4 §4).
 */
export function templatesForNewCases(
    templates: readonly StoredDocumentTemplate[],
    jurisdiction: Jurisdiction,
): StoredDocumentTemplate[] {
    return templates.filter((t) => t.active && t.copyToNewCases && t.jurisdictions.includes(jurisdiction));
}

/**
 * La carpeta en cada estado (V4 §2, `CaseFolderStatus`): `CREATED` con los
 * modelos copiados; `ERROR` (falló el almacenamiento) o `CREATING` (en curso),
 * con los modelos pendientes; `PENDING` (no se pidió), sin enlace ni modelos.
 * No escribe nada: quien la llama decide si suma los usos de los modelos
 * (`countTemplateCopies`).
 */
export function buildFolder(input: {
    caseId: number;
    path: string;
    copyTemplates: boolean;
    templates: number;
    status: CaseFolderStatus;
}): StoredFolder {
    const { status, path, copyTemplates } = input;
    const wanted = copyTemplates && status !== 'PENDING' ? input.templates : 0;
    if (status === 'CREATED') {
        return { status, url: folderUrl(input.caseId), path, templatesCopied: wanted, templatesPending: 0, copyTemplates };
    }
    return { status, url: null, path, templatesCopied: 0, templatesPending: wanted, copyTemplates: status === 'PENDING' ? false : copyTemplates };
}

/** Suma un uso a cada modelo copiado a la carpeta de una causa. */
export function countTemplateCopies(jurisdiction: Jurisdiction): void {
    for (const template of templatesForNewCases(db.documentTemplates, jurisdiction)) {
        template.usageCount += 1;
    }
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

    const documentTemplates = DOCUMENT_TEMPLATES.map((t) => ({ ...t, jurisdictions: [...t.jurisdictions] }));
    const cases: StoredCase[] = [];
    const proceduralActs: StoredAct[] = [];
    const interruptiveActs: StoredInterruptiveAct[] = [];
    const documents: StoredDocument[] = [];
    const caseFileVersions = new Map<number, number>();
    let caseFileId = 0;

    for (const seed of CASE_SEEDS) {
        const lawyer = LAWYERS.find((l) => l.id === seed.responsibleLawyerId);
        if (!lawyer) throw new Error(`[mock] La causa ${seed.id} apunta al abogado ${seed.responsibleLawyerId}, que no existe.`);

        // Los usos de los modelos ya cuentan estas copias: no se suman otra vez.
        const folder = seed.folder
            ? buildFolder({
                  caseId: seed.id,
                  path: folderPath({ lawyer, jurisdiction: seed.jurisdiction, caption: seed.caption }),
                  copyTemplates: true,
                  templates: templatesForNewCases(documentTemplates, seed.jurisdiction).length,
                  status: seed.folder.status,
              })
            : null;

        const stored: StoredCase = {
            id: seed.id,
            sacNumber: seed.sacNumber,
            caption: seed.caption,
            court: seed.court,
            jurisdiction: seed.jurisdiction,
            proceduralRole: seed.proceduralRole,
            instructorName: seed.instructorName,
            tribunalPhone: seed.tribunalPhone,
            instructorExtension: seed.instructorExtension,
            counterparty: seed.counterparty ?? null,
            subjectMatter: seed.subjectMatter ?? null,
            ...jurisdictionData(seed, today),
            courtFeePaid: seed.courtFeePaid ?? false,
            clientId: seed.clientId,
            responsibleLawyerId: seed.responsibleLawyerId,
            qualifications: (seed.qualifications ?? []).map((q) => ({ ...q })),
            // Sin SAC no hay fecha de inicio en sede judicial (D-38).
            startDate: seed.sacNumber === null ? null : resolveSeedDate(seed.startDate, today),
            folder,
            prescriptionDeclaration: null,
            active: true,
            deactivation: null,
        };
        cases.push(stored);

        // Una carpeta creada tiene adentro las copias de los modelos del fuero.
        if (folder?.status === 'CREATED') {
            const createdOn = stored.startDate ?? today;
            documents.push(...templateCopies(stored.id, documentTemplates, stored.jurisdiction, `${createdOn}T09:00:00-03:00`));
        }

        // Los actos los registró quien lleva la causa: sólo el abogado
        // responsable lo hace (D-30), y la cuenta sale de su ficha.
        const registeredBy = users.find((u) => u.lawyerId === seed.responsibleLawyerId);
        if (!registeredBy) {
            throw new Error(`[mock] El abogado ${seed.responsibleLawyerId} de la causa ${seed.id} no tiene usuario.`);
        }
        for (const act of seed.acts) {
            proceduralActs.push(seedAct(act, proceduralActs.length + 1, stored, registeredBy.id, today));
        }
        for (const act of seed.interruptiveActs ?? []) {
            const actDate = resolveSeedDate(act.on, today);
            interruptiveActs.push({
                id: interruptiveActs.length + 1,
                caseId: stored.id,
                name: act.name,
                actDate,
                notes: act.notes ?? null,
                registeredById: registeredBy.id,
                registeredAt: `${actDate}T10:00:00-03:00`,
            });
        }
        if (seed.prescriptionDeclaration) {
            stored.prescriptionDeclaration = {
                ...seed.prescriptionDeclaration,
                registeredById: registeredBy.id,
                registeredAt: `${seed.prescriptionDeclaration.prescriptionDate}T10:00:00-03:00`,
            };
        }
    }

    DOCUMENT_SEEDS.forEach((seed, index) => {
        const on = `${resolveSeedDate(seed.on, today)}T11:00:00-03:00`;
        let caseFile: StoredDocument['caseFile'] = null;
        if (seed.caseFile) {
            caseFileId += 1;
            caseFile = { id: caseFileId, version: seed.caseFile.version, parts: [...seed.caseFile.parts], cover: null };
            caseFileVersions.set(seed.caseId, Math.max(caseFileVersions.get(seed.caseId) ?? 0, seed.caseFile.version));
        }
        documents.push({
            id: `vz-doc-${index + 1}`,
            caseId: seed.caseId,
            name: seed.name,
            mimeType: seed.mimeType,
            sizeBytes: seed.sizeBytes,
            createdAt: on,
            modifiedAt: on,
            uploadedBy: seed.uploadedBy,
            caseFile,
        });
    });

    return {
        users,
        lawyers: LAWYERS.map((l) => ({ ...l })),
        proceduralStates: PROCEDURAL_STATES.map((s) => ({ ...s })),
        legalQualifications: LEGAL_QUALIFICATIONS.map((q) => ({ ...q })),
        clients: CLIENTS.map((c) => ({ ...c })),
        cases,
        proceduralActs,
        interruptiveActs,
        documentTemplates,
        documents,
        caseFileVersions,
        nextCaseFileId: caseFileId + 1,
        failures: { documentStorage: false },
        passwords,
        sessions: new Map(),
        expiredTokens: new Set(),
        loginAttempts: new Map(),
        nextUserId: Math.max(...USERS.map((u) => u.id)) + 1,
        nextLawyerId: Math.max(...LAWYERS.map((l) => l.id)) + 1,
        nextProceduralStateId: Math.max(...PROCEDURAL_STATES.map((s) => s.id)) + 1,
        nextLegalQualificationId: Math.max(...LEGAL_QUALIFICATIONS.map((q) => q.id)) + 1,
        nextClientId: Math.max(...CLIENTS.map((c) => c.id)) + 1,
        nextCaseId: Math.max(...CASE_SEEDS.map((c) => c.id)) + 1,
        nextProceduralActId: proceduralActs.length + 1,
        nextInterruptiveActId: interruptiveActs.length + 1,
        nextDocumentTemplateId: Math.max(...DOCUMENT_TEMPLATES.map((t) => t.id)) + 1,
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
    if (sessionStore) db.sessions = new PersistedSessions(sessionStore);
}

/* ------------------------------------------------------------------ */
/* Sesiones que sobreviven a la recarga (sólo en el navegador)         */
/* ------------------------------------------------------------------ */

const SESSIONS_KEY = 'vz-mock-sessions';

/** Dónde se guardan las sesiones, o `null` si no se guardan (tests). */
let sessionStore: Storage | null = null;

/**
 * `sessions` que se copia al almacenamiento en cada cambio.
 *
 * La base vive en la memoria de la página: sin esto, cada recarga —un F5 o
 * una recarga completa de Vite al guardar un archivo— borra los tokens
 * emitidos, el front manda uno que el mock ya no conoce, la renovación
 * también falla y la sesión se cierra.
 */
class PersistedSessions extends Map<string, number> {
    private readonly store: Storage;

    constructor(store: Storage, entries: [string, number][] = []) {
        super(entries);
        this.store = store;
    }

    override set(token: string, userId: number): this {
        super.set(token, userId);
        this.save();
        return this;
    }

    override delete(token: string): boolean {
        const deleted = super.delete(token);
        this.save();
        return deleted;
    }

    override clear(): void {
        super.clear();
        this.save();
    }

    private save(): void {
        // `super(entries)` llama a `set` antes de que exista `store`.
        if (!this.store) return;
        try {
            this.store.setItem(SESSIONS_KEY, JSON.stringify([...this.entries()]));
        } catch {
            // Sin almacenamiento la sesión dura lo que la página, como antes.
        }
    }
}

/**
 * Guarda las sesiones en `store` y recupera las de la página anterior.
 *
 * La llama `startMocks()`. Los tests no: cada uno arranca con la base limpia.
 * Usa el mismo almacenamiento que el front para su sesión (`localStorage`),
 * así una pestaña nueva también la encuentra.
 */
export function persistSessions(store: Storage): void {
    let entries: [string, number][] = [];
    try {
        const parsed: unknown = JSON.parse(store.getItem(SESSIONS_KEY) ?? '[]');
        if (Array.isArray(parsed)) {
            entries = parsed.filter(
                (e): e is [string, number] =>
                    Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'number',
            );
        }
    } catch {
        // Un valor roto se descarta: hay que volver a entrar, nada más.
    }

    sessionStore = store;
    db.sessions = new PersistedSessions(store, entries);

    // Que un token nuevo no repita el número de uno recuperado.
    for (const [token] of entries) {
        const n = Number(token.split('-').pop());
        if (Number.isInteger(n) && n > db.issuedTokens) db.issuedTokens = n;
    }
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

/**
 * `true` si el estado actual de la causa cierra su ciclo de vida. Una causa
 * marcada como prescripta está en "Prescripta" aunque ningún acto la haya
 * llevado ahí (V4 D-54).
 */
export function isInTerminalState(caseId: number): boolean {
    if (db.cases.find((c) => c.id === caseId)?.prescriptionDeclaration) return true;
    const act = latestActOf(caseId);
    if (!act || act.proceduralStateId === null) return false;
    return db.proceduralStates.find((s) => s.id === act.proceduralStateId)?.terminal === true;
}

/**
 * El id del estado de la tabla en que está hoy la causa: el de su último acto,
 * o "Prescripta" si fue marcada. `null` en "Iniciada" y en un estado escrito a
 * mano. Es lo que compara el filtro `proceduralStateId` del listado.
 */
export function currentStateIdOf(stored: StoredCase): number | null {
    if (stored.prescriptionDeclaration) return PRESCRIBED_STATE_ID;
    return latestActOf(stored.id)?.proceduralStateId ?? null;
}

/** Los actos interruptivos de una causa, del más reciente al más antiguo (V4 §3.9). */
export function interruptiveActsOf(caseId: number): StoredInterruptiveAct[] {
    return db.interruptiveActs
        .filter((a) => a.caseId === caseId)
        // A igual fecha, primero el último registrado.
        .sort((a, b) => b.actDate.localeCompare(a.actDate) || b.id - a.id);
}

/** La fecha del acto interruptivo que rige: el más reciente. `null` si no hay. */
function latestInterruptiveActDate(caseId: number): string | null {
    return interruptiveActsOf(caseId)[0]?.actDate ?? null;
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
        lastName: stored.lastName,
        firstName: stored.firstName,
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
        lastName: lawyer.lastName,
        firstName: lawyer.firstName,
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
 * El estado procesal como lo devuelve un `GET`: con las causas que están hoy en
 * él, **activas o no** (V4 D-70). "Archivada" y "Prescripta" cuentan las causas
 * que cerraron así; las dadas de baja y las que siguen en "Iniciada" no cuentan.
 *
 * `POST` y `PATCH` no pasan por acá: devuelven el estado sin `caseCount`
 * (V3 D-32).
 */
export function toProceduralState(stored: StoredProceduralState): ProceduralState {
    return {
        ...stored,
        caseCount: db.cases.filter((c) => c.active && currentStateIdOf(c) === stored.id).length,
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
 * la prescripción de las causas que la registran (D-08).
 *
 * Corre desde el acto interruptivo más reciente de la causa, que alcanza a
 * todas sus calificaciones (V4 D-49), salvo que sea anterior al hecho de
 * esta: ahí sigue corriendo desde el hecho (CA-31.5). La fecha del hecho no
 * cambia nunca.
 */
function embedQualification(
    stored: StoredCaseQualification,
    interruptedOn: string | null,
): CaseLegalQualification {
    const qualification = db.legalQualifications.find((q) => q.id === stored.legalQualificationId);
    if (!qualification) {
        throw new Error(`[mock] La causa apunta a la calificación ${stored.legalQualificationId}, que no existe.`);
    }
    const prescriptionStartsOn =
        interruptedOn !== null && interruptedOn >= stored.offenseDate ? interruptedOn : stored.offenseDate;
    return {
        id: qualification.id,
        name: qualification.name,
        prescriptionMonths: qualification.prescriptionMonths,
        offenseDate: stored.offenseDate,
        prescriptionStartsOn,
        prescriptionExpiresOn: addMonths(prescriptionStartsOn, qualification.prescriptionMonths),
    };
}

/** El umbral fijo de la alerta de prescripción: el "aviso al 70 %" (V4 D-51). */
const PRESCRIPTION_ALERT_RATIO = 0.7;

/**
 * La prescripción que rige la causa: la de la calificación que prescribe
 * primero (V4 §3.7 y §4, "Prescripción"). `null` fuera del penal y en una
 * causa penal sin calificaciones. En una causa prescripta se sigue
 * devolviendo, como dato histórico.
 */
function prescriptionOf(
    stored: StoredCase,
    qualifications: CaseLegalQualification[],
    interruptedOn: string | null,
): CasePrescription | null {
    if (stored.jurisdiction !== 'CRIMINAL' || qualifications.length === 0) return null;

    const governing = [...qualifications].sort((a, b) =>
        a.prescriptionExpiresOn.localeCompare(b.prescriptionExpiresOn),
    )[0];
    const today = todayIso();
    const total = calendarDaysBetween(governing.prescriptionStartsOn, governing.prescriptionExpiresOn);
    const elapsed = Math.min(Math.max(calendarDaysBetween(governing.prescriptionStartsOn, today), 0), total);
    // El umbral se evalúa sobre el valor exacto, no sobre el redondeado.
    const ratio = total > 0 ? elapsed / total : 1;

    return {
        legalQualificationId: governing.id,
        legalQualificationName: governing.name,
        startsOn: governing.prescriptionStartsOn,
        expiresOn: governing.prescriptionExpiresOn,
        elapsedPercentage: Math.round(ratio * 100),
        alert: ratio >= PRESCRIPTION_ALERT_RATIO,
        expired: today >= governing.prescriptionExpiresOn,
        // Sólo si es el acto el que fija el inicio de la que rige.
        lastInterruptiveActDate:
            interruptedOn !== null && governing.prescriptionStartsOn === interruptedOn ? interruptedOn : null,
    };
}

/**
 * El estado actual de la causa, con su vencimiento (V3 D-34 y D-35).
 *
 * Sin actos, la causa está en el estado inicial: "Iniciada", sin acto que la
 * haya llevado ahí y sin vencimiento. Con actos, el estado y el vencimiento
 * son los del acto de fecha más reciente.
 */
/**
 * El vencimiento para presentar el amparo desde el acto lesivo (V4 §3.7,
 * D-78). Sólo en un amparo activo con fecha del acto lesivo y **todavía en
 * "Iniciada"**: el primer acto procesal indica que el amparo ya se presentó.
 *
 * Si el acto se renueva, rige la renovación más reciente que no supera hoy,
 * cada `harmfulActRenewalDays` días corridos desde la fecha cargada. El plazo
 * se cuenta como el de un acto procesal.
 */
function harmfulActDeadlineOf(stored: StoredCase): HarmfulActDeadline | null {
    if (stored.jurisdiction !== 'AMPARO' || !stored.active) return null;
    if (stored.harmfulActDate === null || stored.harmfulActTermDays === null) return null;
    if (stored.harmfulActTermDayType === null) return null;
    if (latestActOf(stored.id) || stored.prescriptionDeclaration) return null;

    const today = todayIso();
    let actDate = stored.harmfulActDate;
    const every = stored.harmfulActRenews ? stored.harmfulActRenewalDays : null;
    if (every !== null && every > 0 && today > stored.harmfulActDate) {
        const renewals = Math.floor(calendarDaysBetween(stored.harmfulActDate, today) / every);
        actDate = addCalendarDays(stored.harmfulActDate, renewals * every);
    }

    const dueDate = computeDueDate(actDate, stored.harmfulActTermDays, stored.harmfulActTermDayType);
    if (dueDate === null) return null;
    return {
        actDate,
        renewed: actDate !== stored.harmfulActDate,
        dueDate,
        businessDaysRemaining: businessDaysUntil(dueDate),
    };
}

function currentStateOf(caseId: number): CurrentState {
    /* Marcada como prescripta: "Prescripta", sin el acto que la llevó y con
       los plazos cerrados (V4 D-54). */
    if (db.cases.find((c) => c.id === caseId)?.prescriptionDeclaration) {
        const prescribed = db.proceduralStates.find((s) => s.id === PRESCRIBED_STATE_ID);
        return {
            proceduralStateId: PRESCRIBED_STATE_ID,
            name: prescribed?.name ?? 'Prescripta',
            custom: false,
            initial: false,
            proceduralActId: null,
            dueDate: null,
            businessDaysRemaining: null,
            manuallyAdjusted: false,
        };
    }

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

    const interruptedOn = latestInterruptiveActDate(stored.id);
    const legalQualifications = stored.qualifications.map((q) => embedQualification(q, interruptedOn));

    return {
        id: stored.id,
        sacNumber: stored.sacNumber,
        caption: stored.caption,
        court: stored.court,
        jurisdiction: stored.jurisdiction,
        proceduralRole: stored.proceduralRole,
        instructorName: stored.instructorName,
        tribunalPhone: stored.tribunalPhone,
        instructorExtension: stored.instructorExtension,
        counterparty: stored.counterparty,
        subjectMatter: stored.subjectMatter,
        clientDetained: stored.clientDetained,
        injunctionGranted: stored.injunctionGranted,
        harmfulActDate: stored.harmfulActDate,
        harmfulActRenews: stored.harmfulActRenews,
        harmfulActRenewalDays: stored.harmfulActRenewalDays,
        harmfulActTermDays: stored.harmfulActTermDays,
        harmfulActTermDayType: stored.harmfulActTermDayType,
        harmfulActDeadline: harmfulActDeadlineOf(stored),
        administrativeRemedyExhaustedOn: stored.administrativeRemedyExhaustedOn,
        courtFeePaid: stored.courtFeePaid,
        client: embedClient(stored.clientId),
        responsibleLawyer: lawyer,
        legalQualifications,
        prescription: prescriptionOf(stored, legalQualifications, interruptedOn),
        prescriptionDeclaration: stored.prescriptionDeclaration
            ? {
                  prescriptionDate: stored.prescriptionDeclaration.prescriptionDate,
                  resolution: stored.prescriptionDeclaration.resolution,
                  grounds: stored.prescriptionDeclaration.grounds,
                  registeredBy: userRef(stored.prescriptionDeclaration.registeredById),
                  registeredAt: stored.prescriptionDeclaration.registeredAt,
              }
            : null,
        startDate: stored.startDate,
        currentState: currentStateOf(stored.id),
        folder: stored.folder ? toFolder(stored.folder) : null,
        active: stored.active,
    };
}

/** La carpeta como la devuelve la API, sin el dato interno del reintento. */
export function toFolder(stored: StoredFolder): CaseFolder {
    return {
        status: stored.status,
        url: stored.url,
        path: stored.path,
        templatesCopied: stored.templatesCopied,
        templatesPending: stored.templatesPending,
    };
}

/** `{ id, lastName, firstName }` de un usuario: quién registró o cargó algo (D-68). */
export function userRef(userId: number): PersonRef {
    const user = db.users.find((u) => u.id === userId);
    return { id: userId, lastName: user?.lastName ?? '', firstName: user?.firstName ?? '' };
}

/** El acto interruptivo tal como lo devuelve la API (V4 §3.9). */
export function toInterruptiveAct(stored: StoredInterruptiveAct): InterruptiveAct {
    return {
        id: stored.id,
        caseId: stored.caseId,
        name: stored.name,
        actDate: stored.actDate,
        notes: stored.notes,
        registeredBy: userRef(stored.registeredById),
        registeredAt: stored.registeredAt,
    };
}

/** El modelo formal tal como lo devuelve la API (V4 §3.10). */
export function toDocumentTemplate(stored: StoredDocumentTemplate): DocumentTemplate {
    return {
        id: stored.id,
        name: stored.name,
        jurisdictions: [...stored.jurisdictions],
        fileName: stored.fileName,
        copyToNewCases: stored.copyToNewCases,
        lastVersionAt: stored.lastVersionAt,
        lastVersionBy: userRef(stored.lastVersionById),
        usageCount: stored.usageCount,
        active: stored.active,
    };
}

/** El acto procesal tal como lo devuelve su registro. */
export function toProceduralAct(stored: StoredAct): ProceduralAct {
    return {
        id: stored.id,
        caseId: stored.caseId,
        resultingState: stateOfAct(stored),
        actDate: stored.actDate,
        notificationDate: stored.notificationDate,
        notes: stored.notes,
        deadline: stored.deadline ? { ...stored.deadline } : null,
        registeredBy: userRef(stored.registeredById),
        registeredAt: stored.registeredAt,
        lastModifiedBy: stored.lastModifiedById === null ? null : userRef(stored.lastModifiedById),
        lastModifiedAt: stored.lastModifiedAt,
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
