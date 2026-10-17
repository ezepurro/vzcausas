/**
 * Respuestas de ejemplo, una por cada código documentado en el contrato.
 *
 * Sirven para dos cosas:
 *
 * 1. Como fixtures de test: `expect(...).toEqual(RESPONSES.listUsers.ok.body)`.
 * 2. Como catálogo: `RESPONSES.deleteUser` muestra de un vistazo todo lo que
 *    esa pantalla tiene que saber manejar.
 *
 * El servidor falso (`handlers.ts`) **no** devuelve estas constantes: arma las
 * respuestas a partir de los datos vivos. Los mensajes de error, en cambio,
 * sí los comparte, para que un cambio de redacción se haga en un solo lugar.
 *
 * Los textos van en castellano: son los que define el contrato y los que ve
 * el usuario.
 */

import {
    buildPagination,
    errorBody,
    itemBody,
    listBody,
    type AdministratorDashboard,
    type Case,
    type CaseFolder,
    type Client,
    type DeadlinePreview,
    type DocumentTemplate,
    type ErrorBody,
    type InterruptiveAct,
    type LawyerDashboard,
    type Lawyer,
    type LegalQualification,
    type ProceduralAct,
    type ProceduralState,
    type Role,
    type Session,
    type User,
    type WrittenLegalQualification,
    type WrittenProceduralState,
} from './contract';

/** Una respuesta HTTP del mock. `body` es `null` en los 204. */
export interface MockResponse<T = unknown> {
    status: number;
    body: T;
    /** Sólo para lo que el contrato pide como encabezado, ej. `Retry-After`. */
    headers?: Record<string, string>;
    /**
     * Una respuesta que no es JSON: el archivo de un modelo formal (V4 §5.1,
     * "GET — Archivo"). Con `file`, `body` se ignora.
     */
    file?: MockFile;
}

/** Un archivo que viaja como respuesta, con su tipo y su nombre. */
export interface MockFile {
    content: string;
    contentType: string;
    fileName: string;
}

function response<T>(status: number, body: T): MockResponse<T> {
    return { status, body };
}

/** 204 No Content: sin cuerpo. */
export const NO_CONTENT: MockResponse<null> = response(204, null);

/* ------------------------------------------------------------------ */
/* Errores reutilizables                                               */
/* ------------------------------------------------------------------ */

/**
 * Los mensajes que el contrato repite endpoint por endpoint.
 *
 * El contrato conserva **dos redacciones del 401**: la de `/auth/*` menciona
 * el token y la del resto no. El 403 nombra el rol que falta, `ADMINISTRATOR`
 * o `SECRETARY` (§4, permisos por perfil); el de los actos procesales es otro,
 * porque ahí no falta un rol sino ser el abogado responsable de la causa.
 */
export const ERRORS = {
    /* ---- 400 ---- */
    invalidUserId: errorBody(
        'INVALID_PATH_PARAMETER',
        'El identificador del usuario no es válido.',
        { userId: 'Debe ser un número entero válido.' },
    ),
    invalidLawyerId: errorBody(
        'INVALID_PATH_PARAMETER',
        'El identificador del abogado no es válido.',
        { lawyerId: 'Debe ser un número entero válido.' },
    ),
    invalidProceduralStateId: errorBody(
        'INVALID_PATH_PARAMETER',
        'El identificador del estado procesal no es válido.',
        { stateId: 'Debe ser un número entero válido.' },
    ),
    invalidLegalQualificationId: errorBody(
        'INVALID_PATH_PARAMETER',
        'El identificador de la calificación legal no es válido.',
        { qualificationId: 'Debe ser un número entero válido.' },
    ),
    invalidClientId: errorBody(
        'INVALID_PATH_PARAMETER',
        'El identificador del cliente no es válido.',
        { clientId: 'Debe ser un número entero válido.' },
    ),
    invalidCaseId: errorBody(
        'INVALID_PATH_PARAMETER',
        'El identificador de la causa no es válido.',
        { caseId: 'Debe ser un número entero válido.' },
    ),
    invalidPagination: errorBody(
        'INVALID_PAGINATION',
        'Los parámetros de paginación no son válidos.',
        {
            page: 'Debe ser un número entero mayor o igual a 1.',
            limit: 'Debe ser un número entero entre 1 y 100.',
        },
    ),
    invalidRole: errorBody('INVALID_REQUEST', 'Parámetros de query inválidos.', {
        role: 'No existe un rol con ese nombre.',
    }),
    invalidJurisdiction: errorBody('INVALID_REQUEST', 'Parámetros de query inválidos.', {
        jurisdiction: 'No existe un fuero procesal con ese nombre.',
    }),

    invalidActId: errorBody(
        'INVALID_PATH_PARAMETER',
        'El identificador del acto procesal no es válido.',
        { actId: 'Debe ser un número entero válido.' },
    ),
    invalidDocumentTemplateId: errorBody(
        'INVALID_PATH_PARAMETER',
        'El identificador del modelo formal no es válido.',
        { templateId: 'Debe ser un número entero válido.' },
    ),

    /* ---- 401 ---- */
    /**
     * Credenciales incorrectas. Sólo en el login. El mismo mensaje exista o
     * no exista el usuario: distinguirlos permitiría enumerar cuentas (D-41).
     */
    invalidCredentials: errorBody('INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.'),
    /** 401 de `/auth/logout` y `/auth/password`. */
    unauthenticatedAuth: errorBody(
        'UNAUTHENTICATED',
        'La autenticación es requerida o el token proporcionado no es válido.',
    ),
    /** 401 del resto de los endpoints protegidos. */
    unauthenticated: errorBody('UNAUTHENTICATED', 'La autenticación es requerida.'),

    /* ---- 403 ---- */
    /** Administración: usuarios, y escribir abogados. */
    forbidden: forbiddenFor('ADMINISTRATOR'),
    /** Registro de un acto procesal y su previsualización (D-30). */
    forbiddenNotResponsible: errorBody(
        'FORBIDDEN',
        'Solo el abogado responsable de la causa puede registrar actos procesales.',
    ),
    /** Registro de un acto interruptivo (V4 §3.9). */
    forbiddenNotResponsibleInterruptive: errorBody(
        'FORBIDDEN',
        'Solo el abogado responsable de la causa puede registrar actos interruptivos.',
    ),
    /** Modelos formales, configuración de avisos y marca de prescripción (V4 §4). */
    forbiddenAdministratorOrLawyer: errorBody(
        'FORBIDDEN',
        'Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.',
    ),

    /* ---- 404 ---- */
    userNotFound: errorBody('USER_NOT_FOUND', 'No se encontró el usuario solicitado.'),
    lawyerNotFound: errorBody('LAWYER_NOT_FOUND', 'No se encontró el abogado solicitado.'),
    proceduralStateNotFound: errorBody(
        'PROCEDURAL_STATE_NOT_FOUND',
        'No se encontró el estado procesal solicitado.',
    ),
    legalQualificationNotFound: errorBody(
        'LEGAL_QUALIFICATION_NOT_FOUND',
        'No se encontró la calificación legal solicitada.',
    ),
    clientNotFound: errorBody('CLIENT_NOT_FOUND', 'No se encontró el cliente solicitado.'),
    caseNotFound: errorBody('CASE_NOT_FOUND', 'No se encontró la causa solicitada.'),
    proceduralActNotFound: errorBody('PROCEDURAL_ACT_NOT_FOUND', 'No se encontró el acto procesal solicitado.'),
    documentTemplateNotFound: errorBody(
        'DOCUMENT_TEMPLATE_NOT_FOUND',
        'No se encontró el modelo formal solicitado.',
    ),
    resourceNotFound: errorBody('RESOURCE_NOT_FOUND', 'No se encontró el recurso solicitado.'),

    /* ---- 409 ---- */
    usernameTaken: errorBody(
        'USERNAME_ALREADY_EXISTS',
        'El nombre de usuario ya se encuentra registrado.',
    ),
    emailTaken: errorBody(
        'EMAIL_ALREADY_EXISTS',
        'El correo electrónico ya se encuentra registrado.',
    ),
    registrationTaken: errorBody(
        'LAWYER_REGISTRATION_ALREADY_EXISTS',
        'La matrícula del abogado ya se encuentra registrada.',
    ),
    /* El backend además manda `lawyerId` numérico en `details`; se omite
       porque acá sólo van textos y el front no lo lee. */
    lawyerAlreadyLinked: errorBody(
        'LAWYER_ALREADY_LINKED',
        'El abogado ya tiene una cuenta de usuario activa.',
        { field: 'lawyerId' },
    ),
    proceduralStateNameTaken: errorBody(
        'PROCEDURAL_STATE_ALREADY_EXISTS',
        'Ya existe un estado procesal con esa denominación en el fuero.',
    ),
    userHasDependencies: errorBody(
        'USER_HAS_DEPENDENCIES',
        'No se puede dar de baja el usuario porque posee recursos asociados.',
    ),
    lawyerHasDependencies: errorBody(
        'LAWYER_HAS_DEPENDENCIES',
        'No se puede dar de baja el abogado porque posee recursos asociados.',
    ),
    legalQualificationNameTaken: errorBody(
        'LEGAL_QUALIFICATION_ALREADY_EXISTS',
        'Ya existe una calificación legal con esa denominación.',
    ),
    clientDniTaken: errorBody(
        'CLIENT_DNI_ALREADY_EXISTS',
        'Ya existe un cliente registrado con ese DNI.',
    ),
    caseSacTaken: errorBody(
        'CASE_SAC_ALREADY_EXISTS',
        'Ya existe una causa registrada con ese número de SAC.',
    ),
    documentTemplateNameTaken: errorBody(
        'DOCUMENT_TEMPLATE_ALREADY_EXISTS',
        'Ya existe un modelo formal con ese nombre.',
    ),

    /* ---- 413 ---- */
    fileTooLarge: errorBody('FILE_TOO_LARGE', 'El archivo supera el tamaño máximo de 10 MB.'),

    /* ---- 422 ---- */
    invalidCurrentPassword: errorBody(
        'INVALID_CURRENT_PASSWORD',
        'La contraseña actual es incorrecta.',
    ),
    caseInTerminalState: errorBody(
        'CASE_IN_TERMINAL_STATE',
        'La causa se encuentra en un estado terminal y no admite actos procesales.',
    ),
    /** El mismo código, para el acto interruptivo y la marca de prescripción (V4 §7.4). */
    caseInTerminalStateOperation: errorBody(
        'CASE_IN_TERMINAL_STATE',
        'La causa se encuentra en un estado terminal y no admite esta operación.',
    ),
    prescriptionNotApplicable: errorBody(
        'PRESCRIPTION_NOT_APPLICABLE',
        'La prescripción solo aplica a las causas del fuero penal.',
    ),
    proceduralStateProtected: errorBody(
        'PROCEDURAL_STATE_PROTECTED',
        'El estado Prescripta es un estado del sistema y no puede modificarse ni darse de baja.',
    ),
    /** Marcar prescripta una causa penal sin calificaciones (V4 D-74). */
    prescriptionWithoutQualifications: errorBody(
        'PRESCRIPTION_NOT_APPLICABLE',
        'La causa no tiene calificaciones legales: no puede prescribir.',
    ),

    /* ---- 429 ---- */
    /**
     * Bloqueo por 5 fallos consecutivos de login (`db.loginAttempts`, V3 §4).
     * El mock no mide tiempo real, así que siempre devuelve el primer
     * escalón (90 s) en vez de una escalera creciente como el backend.
     */
    tooManyLoginAttempts: errorBody(
        'TOO_MANY_LOGIN_ATTEMPTS',
        'Demasiados intentos fallidos. Esperá antes de volver a intentar.',
        { retryAfterSeconds: 90 },
    ),

    /* ---- 500 ---- */
    internalError: errorBody('INTERNAL_SERVER_ERROR', 'Ocurrió un error interno inesperado.'),

    /* ---- 502 ---- */
    documentStorageUnavailable: errorBody(
        'DOCUMENT_STORAGE_UNAVAILABLE',
        'No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.',
    ),
} satisfies Record<string, ErrorBody>;

/** `403 FORBIDDEN` con el rol que exige la operación. */
export function forbiddenFor(role: Role): ErrorBody {
    return errorBody('FORBIDDEN', `Se requiere el rol ${role} para realizar esta operación.`);
}

/**
 * Fragmento en castellano del `422` de cada operación.
 * La clave es en inglés; el texto es el del contrato.
 */
const BUSINESS_RULE_TEXT = {
    createUser: 'registrar el usuario',
    updateUser: 'modificar el usuario',
    deleteUser: 'dar de baja el usuario',
    createLawyer: 'registrar el abogado',
    updateLawyer: 'modificar el abogado',
    deleteLawyer: 'dar de baja el abogado',
} as const;

export type BusinessRuleOperation = keyof typeof BUSINESS_RULE_TEXT;

/** `422 BUSINESS_RULE_VIOLATION` con el texto que corresponde a la operación. */
export function businessRuleViolation(operation: BusinessRuleOperation): ErrorBody {
    return errorBody(
        'BUSINESS_RULE_VIOLATION',
        `No se puede ${BUSINESS_RULE_TEXT[operation]} debido a una regla de negocio.`,
    );
}

/* ------------------------------------------------------------------ */
/* Ejemplos por endpoint                                               */
/* ------------------------------------------------------------------ */

const EXAMPLE_USER: User = {
    id: 4,
    username: 'iperalta',
    lastName: 'Peralta', firstName: 'Ignacio',
    email: 'iperalta@vazquezzarate.com',
    roles: ['LAWYER'],
    lawyer: { id: 4, lastName: 'Peralta', firstName: 'Ignacio', registrationNumber: '1-35207' },
    lastLoginAt: '2026-09-18T18:20:00-03:00',
    active: true,
};

const EXAMPLE_ADMIN: User = {
    id: 1,
    username: 'fvazquez',
    lastName: 'Vázquez', firstName: 'Fernando G.',
    email: 'fvazquez@vazquezzarate.com',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    lawyer: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.', registrationNumber: '1-28114' },
    lastLoginAt: '2026-09-19T08:12:00-03:00',
    active: true,
};

/** Usuario de secretaría: sin ficha profesional. */
const EXAMPLE_SECRETARY: User = {
    id: 8,
    username: 'gestion',
    lastName: 'Estudio', firstName: 'Gestión',
    email: 'gestion@vazquezzarate.com',
    roles: ['SECRETARY'],
    lawyer: null,
    lastLoginAt: '2026-09-19T07:58:00-03:00',
    active: true,
};

const EXAMPLE_SESSION: Session = {
    accessToken: 'eyJhbGciOi...',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: EXAMPLE_ADMIN,
};

const EXAMPLE_CREATED_USER: User = {
    id: 23,
    username: 'jperez',
    lastName: 'Pérez', firstName: 'Juan',
    email: 'jperez@vazquezzarate.com',
    roles: ['LAWYER'],
    lawyer: { id: 8, lastName: 'Pérez', firstName: 'Juan', registrationNumber: '1-42088' },
    lastLoginAt: null,
    active: true,
};

const EXAMPLE_LAWYER: Lawyer = {
    id: 4,
    lastName: 'Peralta', firstName: 'Ignacio',
    registrationNumber: '1-35207',
    activeCases: 2,
    active: true,
};

const EXAMPLE_CREATED_LAWYER: Lawyer = {
    id: 8,
    lastName: 'Pérez', firstName: 'Juan',
    registrationNumber: '1-42088',
    activeCases: 0,
    active: true,
};

const EXAMPLE_STATE: ProceduralState = {
    id: 4,
    name: 'Oposición al requerimiento de elevación',
    jurisdiction: 'CRIMINAL',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
    caseCount: 1,
    active: true,
};

/** Estado terminal y sin plazo: el caso que el prototipo muestra con `—`. */
const EXAMPLE_TERMINAL_STATE: ProceduralState = {
    id: 9,
    name: 'Archivada',
    jurisdiction: 'CRIMINAL',
    timeLimitDays: 0,
    dayType: 'NONE',
    terminal: true,
    caseCount: 0,
    active: true,
};

/** Lo que devuelve el alta: sin `activeCases`, que es sólo de los `GET` (D-32). */
const EXAMPLE_CREATED_STATE: WrittenProceduralState = {
    id: 25,
    name: 'Vista al fiscal',
    jurisdiction: 'CRIMINAL',
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
    active: true,
};

const EXAMPLE_UPDATED_STATE: WrittenProceduralState = {
    ...EXAMPLE_CREATED_STATE,
    timeLimitDays: 20,
};

const EXAMPLE_QUALIFICATION: LegalQualification = {
    id: 1,
    name: 'Robo calificado — art. 167 inc. 2 CP',
    prescriptionMonths: 96,
    activeCases: 2,
    active: true,
};

/** Lo que devuelve el alta: sin `activeCases` (D-32). */
const EXAMPLE_CREATED_QUALIFICATION: WrittenLegalQualification = {
    id: 10,
    name: 'Estafa — art. 172 CP',
    prescriptionMonths: 72,
    active: true,
};

const EXAMPLE_UPDATED_QUALIFICATION: WrittenLegalQualification = {
    id: 1,
    name: 'Robo calificado — art. 167 inc. 2 CP',
    prescriptionMonths: 120,
    active: true,
};

const EXAMPLE_CLIENT: Client = {
    id: 1,
    lastName: 'GÓMEZ',
    firstName: 'Ariel Fernando',
    dni: '34812905',
    phone: '351 415-2288',
    email: 'afgomez@gmail.com',
    clientSince: '2021-03-12',
    activeCases: 2,
    active: true,
};

const EXAMPLE_CREATED_CLIENT: Client = {
    id: 25,
    lastName: 'TORRES',
    firstName: 'Bruno',
    dni: '35778120',
    phone: null,
    email: null,
    clientSince: '2026-09-29',
    activeCases: 0,
    active: true,
};

/** Causa penal con vencimiento: el ejemplo del contrato. */
const EXAMPLE_CASE: Case = {
    id: 1,
    sacNumber: '13284571',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    court: 'Juzgado de Control N° 3 · Córdoba',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSA',
    instructorName: 'Dra. Verónica Ledesma',
    tribunalPhone: '0351 448-1200',
    instructorExtension: '214',
    counterparty: null,
    subjectMatter: null,
    clientDetained: false,
    injunctionGranted: null,
    harmfulActDate: null,
    harmfulActRenews: null,
    harmfulActRenewalDays: null,
    harmfulActTermDays: null,
    harmfulActTermDayType: null,
    harmfulActDeadline: null,
    administrativeRemedyExhaustedOn: null,
    courtFeePaid: false,
    client: {
        id: 1,
        lastName: 'GÓMEZ',
        firstName: 'Ariel Fernando',
        dni: '34812905',
        phone: '351 415-2288',
        email: 'afgomez@gmail.com',
        clientSince: '2021-03-12',
    },
    responsibleLawyer: { id: 3, lastName: 'Ríos', firstName: 'Malena', registrationNumber: '1-36842' },
    legalQualifications: [
        {
            id: 1,
            name: 'Robo calificado — art. 167 inc. 2 CP',
            prescriptionMonths: 96,
            offenseDate: '2021-02-27',
            // El acto interruptivo del 04/07/2024 reinició el cómputo (V4 §3.9).
            prescriptionStartsOn: '2024-07-04',
            prescriptionExpiresOn: '2032-07-04',
        },
    ],
    prescription: {
        legalQualificationId: 1,
        legalQualificationName: 'Robo calificado — art. 167 inc. 2 CP',
        startsOn: '2024-07-04',
        expiresOn: '2032-07-04',
        elapsedPercentage: 27,
        alert: false,
        expired: false,
        lastInterruptiveActDate: '2024-07-04',
    },
    prescriptionDeclaration: null,
    startDate: '2021-03-12',
    // El vencimiento es parte del estado actual: lo abrió el acto que la llevó a él (D-35).
    currentState: {
        proceduralStateId: 4,
        name: 'Oposición al requerimiento de elevación',
        custom: false,
        initial: false,
        proceduralActId: 3,
        dueDate: '2026-09-16',
        businessDaysRemaining: 1,
        manuallyAdjusted: false,
    },
    folder: {
        status: 'CREATED',
        url: 'https://drive.google.com/drive/folders/vz-causa-1',
        path: '/VZ Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
        templatesCopied: 6,
        templatesPending: 0,
    },
    active: true,
};

/** La carpeta cuando el almacenamiento en la nube no respondió (V4 D-62). */
const EXAMPLE_PENDING_FOLDER: CaseFolder = {
    status: 'PENDING',
    url: null,
    path: '/VZ Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    templatesCopied: 0,
    templatesPending: 6,
};

/**
 * Causa recién registrada: en el estado inicial, "Iniciada", y sin
 * vencimiento. Es lo que devuelve siempre el `POST /cases` (V3 D-34).
 */
const EXAMPLE_CREATED_CASE: Case = {
    ...EXAMPLE_CASE,
    id: 24,
    sacNumber: '14200315',
    startDate: '2026-09-29',
    legalQualifications: [
        {
            id: 1,
            name: 'Robo calificado — art. 167 inc. 2 CP',
            prescriptionMonths: 96,
            offenseDate: '2021-02-27',
            prescriptionStartsOn: '2021-02-27',
            prescriptionExpiresOn: '2029-02-27',
        },
    ],
    prescription: {
        legalQualificationId: 1,
        legalQualificationName: 'Robo calificado — art. 167 inc. 2 CP',
        startsOn: '2021-02-27',
        expiresOn: '2029-02-27',
        elapsedPercentage: 69,
        alert: false,
        expired: false,
        lastInterruptiveActDate: null,
    },
    folder: {
        status: 'CREATED',
        url: 'https://drive.google.com/drive/folders/vz-causa-24',
        path: '/VZ Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
        templatesCopied: 6,
        templatesPending: 0,
    },
    currentState: {
        proceduralStateId: null,
        name: 'Iniciada',
        custom: false,
        initial: true,
        proceduralActId: null,
        dueDate: null,
        businessDaysRemaining: null,
        manuallyAdjusted: false,
    },
};

const EXAMPLE_ACT: ProceduralAct = {
    id: 3,
    caseId: 1,
    resultingState: {
        proceduralStateId: 4,
        name: 'Oposición al requerimiento de elevación',
        custom: false,
    },
    actDate: '2026-09-09',
    notificationDate: null,
    notes: 'Con acusación, pero con oposición.',
    deadline: {
        timeLimitDays: 5,
        dayType: 'BUSINESS',
        countsFrom: '2026-09-09',
        computedDueDate: '2026-09-16',
        dueDate: '2026-09-16',
        manuallyAdjusted: false,
    },
    registeredBy: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
    registeredAt: '2026-09-09T11:42:00-03:00',
};

/** La causa del prototipo con la alerta activa, ya marcada como prescripta (V4 §3.7). */
const EXAMPLE_PRESCRIBED_CASE: Case = {
    ...EXAMPLE_CASE,
    id: 4,
    sacNumber: '11845620',
    caption: 'ACOSTA, Jonathan E. p.s.a. Infracción Ley 23.737',
    legalQualifications: [
        {
            id: 2,
            name: 'Infracción Ley 23.737 — art. 5 inc. c',
            prescriptionMonths: 72,
            offenseDate: '2022-01-19',
            prescriptionStartsOn: '2022-01-19',
            prescriptionExpiresOn: '2028-01-19',
        },
    ],
    prescription: {
        legalQualificationId: 2,
        legalQualificationName: 'Infracción Ley 23.737 — art. 5 inc. c',
        startsOn: '2022-01-19',
        expiresOn: '2028-01-19',
        elapsedPercentage: 78,
        alert: true,
        expired: false,
        lastInterruptiveActDate: null,
    },
    prescriptionDeclaration: {
        prescriptionDate: '2026-09-15',
        resolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
        grounds: 'Transcurrió el plazo del art. 62 inc. 2 CP sin actos interruptivos.',
        registeredBy: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.' },
        registeredAt: '2026-09-15T12:20:00-03:00',
    },
    currentState: {
        proceduralStateId: 10,
        name: 'Prescripta',
        custom: false,
        initial: false,
        proceduralActId: null,
        dueDate: null,
        businessDaysRemaining: null,
        manuallyAdjusted: false,
    },
    folder: null,
};

const EXAMPLE_INTERRUPTIVE_ACT: InterruptiveAct = {
    id: 3,
    caseId: 1,
    name: 'Citación a juicio',
    actDate: '2026-09-15',
    notes: 'Decreto de fs. 212.',
    registeredBy: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
    registeredAt: '2026-09-15T10:30:00-03:00',
};

const EXAMPLE_TEMPLATE: DocumentTemplate = {
    id: 2,
    name: 'Oposición al requerimiento de elevación a juicio',
    jurisdictions: ['CRIMINAL'],
    fileName: 'oposicion-elevacion.docx',
    copyToNewCases: true,
    lastVersionAt: '2026-08-21T17:40:00-03:00',
    lastVersionBy: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
    usageCount: 12,
    active: true,
};

const EXAMPLE_LAWYER_DASHBOARD: LawyerDashboard = {
    date: '2026-09-15',
    lawyer: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.' },
    summary: { dueToday: 1, overdue: 0, dueSoon: 0, activeCases: 14 },
    deadlines: [
        {
            caseId: 6,
            kind: 'PROCEDURAL_ACT',
            sacNumber: '12774310',
            caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
            jurisdiction: 'AMPARO',
            currentStateName: 'Traslado a la demandada',
            responsibleLawyer: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.' },
            dueDate: '2026-09-15',
            businessDaysRemaining: 0,
        },
    ],
    prescriptionAlerts: [
        {
            caseId: 4,
            sacNumber: '11845620',
            caption: 'ACOSTA, Jonathan E. p.s.a. Infracción Ley 23.737',
            responsibleLawyer: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.' },
            legalQualificationName: 'Infracción Ley 23.737 — art. 5 inc. c',
            startsOn: '2022-01-19',
            expiresOn: '2028-01-19',
            elapsedPercentage: 78,
            expired: false,
        },
    ],
    casesToAdvance: [
        {
            caseId: 4,
            sacNumber: '11845620',
            caption: 'ACOSTA, Jonathan E. p.s.a. Infracción Ley 23.737',
            jurisdiction: 'CRIMINAL',
            currentStateName: 'Cédula de notificación',
            lastActDate: '2026-07-06',
            daysSinceLastAct: 71,
        },
    ],
};

const EXAMPLE_ADMINISTRATOR_DASHBOARD: AdministratorDashboard = {
    date: '2026-09-15',
    summary: { dueToday: 1, overdue: 1, dueSoon: 2, activeCases: 105 },
    casesByJurisdiction: [
        { jurisdiction: 'CRIMINAL', activeCases: 63 },
        { jurisdiction: 'ADMINISTRATIVE', activeCases: 31 },
        { jurisdiction: 'AMPARO', activeCases: 11 },
    ],
    deadlines: EXAMPLE_LAWYER_DASHBOARD.deadlines,
    prescriptionAlerts: EXAMPLE_LAWYER_DASHBOARD.prescriptionAlerts,
    team: [
        {
            lawyer: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.' },
            activeCases: 14,
            openDeadlines: { overdue: 0, dueToday: 1, dueSoon: 0, later: 0 },
        },
    ],
};


const EXAMPLE_PREVIEW: DeadlinePreview = {
    proceduralStateId: 4,
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    countsFrom: '2026-09-15',
    dueDate: '2026-09-22',
    businessDaysRemaining: 5,
};

/** Lo que devuelve el cómputo para un estado que no abre plazo. */
const EXAMPLE_PREVIEW_NO_TERM: DeadlinePreview = {
    proceduralStateId: 3,
    timeLimitDays: 0,
    dayType: 'NONE',
    countsFrom: '2026-09-15',
    dueDate: null,
    businessDaysRemaining: null,
};

export const RESPONSES = {
    /** `POST /auth/login` */
    login: {
        ok: response(200, itemBody(EXAMPLE_SESSION)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                username: 'El nombre de usuario es obligatorio.',
                password: 'La contraseña es obligatoria.',
            }),
        ),
        invalidCredentials: response(401, ERRORS.invalidCredentials),
    },

    /** `POST /auth/logout` */
    logout: {
        ok: NO_CONTENT,
        unauthenticated: response(401, ERRORS.unauthenticatedAuth),
    },

    /** `PATCH /auth/password` */
    changePassword: {
        ok: NO_CONTENT,
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                newPassword: 'La contraseña no cumple con los requisitos establecidos.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticatedAuth),
        wrongPassword: response(422, ERRORS.invalidCurrentPassword),
    },

    /** `POST /users` */
    createUser: {
        created: response(201, itemBody(EXAMPLE_CREATED_USER)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                username: 'El nombre de usuario no cumple con el formato requerido.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
        usernameTaken: response(409, ERRORS.usernameTaken),
        emailTaken: response(409, ERRORS.emailTaken),
        registrationTaken: response(409, ERRORS.registrationTaken),
        lawyerAlreadyLinked: response(409, ERRORS.lawyerAlreadyLinked),
        businessRule: response(422, businessRuleViolation('createUser')),
    },

    /** `GET /users` */
    listUsers: {
        ok: response(
            200,
            listBody<User>([EXAMPLE_ADMIN, EXAMPLE_SECRETARY], buildPagination(22, 1, 20)),
        ),
        invalidPagination: response(400, ERRORS.invalidPagination),
        invalidRole: response(400, ERRORS.invalidRole),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
        /** Colección vacía: lo que devuelve un `search` sin resultados. */
        empty: response(200, listBody<User>([], buildPagination(0, 1, 20))),
    },

    /** `GET /users/{userId}` */
    getUser: {
        ok: response(200, itemBody(EXAMPLE_USER)),
        invalidId: response(400, ERRORS.invalidUserId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
        notFound: response(404, ERRORS.userNotFound),
    },

    /** `PATCH /users/{userId}` */
    updateUser: {
        ok: response(200, itemBody({ ...EXAMPLE_USER, roles: ['LAWYER', 'ADMINISTRATOR'] } as User)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                username: 'El nombre de usuario no cumple con el formato requerido.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
        notFound: response(404, ERRORS.userNotFound),
        usernameTaken: response(409, ERRORS.usernameTaken),
        emailTaken: response(409, ERRORS.emailTaken),
        businessRule: response(422, businessRuleViolation('updateUser')),
    },

    /** `DELETE /users/{userId}` — baja lógica. */
    deleteUser: {
        ok: NO_CONTENT,
        invalidId: response(400, ERRORS.invalidUserId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
        notFound: response(404, ERRORS.userNotFound),
        hasDependencies: response(409, ERRORS.userHasDependencies),
        businessRule: response(422, businessRuleViolation('deleteUser')),
    },

    /** `POST /lawyers` */
    createLawyer: {
        created: response(201, itemBody(EXAMPLE_CREATED_LAWYER)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                registrationNumber: 'El formato de la matrícula no es válido.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
        conflict: response(409, ERRORS.registrationTaken),
        businessRule: response(422, businessRuleViolation('createLawyer')),
    },

    /** `GET /lawyers` — cualquier usuario autenticado (V3 D-03). */
    listLawyers: {
        ok: response(200, listBody<Lawyer>([EXAMPLE_LAWYER], buildPagination(10, 1, 20))),
        invalidPagination: response(400, ERRORS.invalidPagination),
        unauthenticated: response(401, ERRORS.unauthenticated),
        empty: response(200, listBody<Lawyer>([], buildPagination(0, 1, 20))),
    },

    /** `GET /lawyers/{lawyerId}` — cualquier usuario autenticado. */
    getLawyer: {
        ok: response(200, itemBody(EXAMPLE_LAWYER)),
        invalidId: response(400, ERRORS.invalidLawyerId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        notFound: response(404, ERRORS.lawyerNotFound),
    },

    /** `PATCH /lawyers/{lawyerId}` */
    updateLawyer: {
        ok: response(200, itemBody({ ...EXAMPLE_LAWYER, lastName: 'Peralta', firstName: 'I.' })),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                registrationNumber: 'El formato de la matrícula no es válido.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
        notFound: response(404, ERRORS.lawyerNotFound),
        conflict: response(409, ERRORS.registrationTaken),
        businessRule: response(422, businessRuleViolation('updateLawyer')),
    },

    /** `DELETE /lawyers/{lawyerId}` — baja lógica. */
    deleteLawyer: {
        ok: NO_CONTENT,
        invalidId: response(400, ERRORS.invalidLawyerId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
        notFound: response(404, ERRORS.lawyerNotFound),
        hasDependencies: response(409, ERRORS.lawyerHasDependencies),
        businessRule: response(422, businessRuleViolation('deleteLawyer')),
    },

    /** `POST /procedural-states` */
    createProceduralState: {
        created: response(201, itemBody(EXAMPLE_CREATED_STATE)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                dayType: 'Debe indicarse el tipo de día cuando el plazo es mayor a 0.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        conflict: response(409, ERRORS.proceduralStateNameTaken),
    },

    /** `GET /procedural-states` — cualquier usuario autenticado (V3 D-03). */
    listProceduralStates: {
        ok: response(
            200,
            listBody<ProceduralState>(
                [EXAMPLE_STATE, EXAMPLE_TERMINAL_STATE],
                buildPagination(24, 1, 20),
            ),
        ),
        invalidJurisdiction: response(400, ERRORS.invalidJurisdiction),
        invalidPagination: response(400, ERRORS.invalidPagination),
        unauthenticated: response(401, ERRORS.unauthenticated),
        empty: response(200, listBody<ProceduralState>([], buildPagination(0, 1, 20))),
    },

    /** `GET /procedural-states/{stateId}` — cualquier usuario autenticado. */
    getProceduralState: {
        ok: response(200, itemBody(EXAMPLE_STATE)),
        invalidId: response(400, ERRORS.invalidProceduralStateId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        notFound: response(404, ERRORS.proceduralStateNotFound),
    },

    /** `PATCH /procedural-states/{stateId}` */
    updateProceduralState: {
        ok: response(200, itemBody(EXAMPLE_UPDATED_STATE)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                body: 'Debe enviarse al menos un campo para modificar.',
            }),
        ),
        invalidId: response(400, ERRORS.invalidProceduralStateId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        notFound: response(404, ERRORS.proceduralStateNotFound),
        conflict: response(409, ERRORS.proceduralStateNameTaken),
        /** El fuero no es modificable (D-36). */
        jurisdiction: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                jurisdiction: 'El fuero de un estado procesal no se puede modificar.',
            }),
        ),
    },

    /**
     * `DELETE /procedural-states/{stateId}` — baja lógica. Procede aunque haya
     * causas en el estado: lo conservan (D-06). Ya no hay `409`.
     */
    deleteProceduralState: {
        ok: NO_CONTENT,
        invalidId: response(400, ERRORS.invalidProceduralStateId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        notFound: response(404, ERRORS.proceduralStateNotFound),
    },

    /** `POST /legal-qualifications` */
    createLegalQualification: {
        created: response(201, itemBody(EXAMPLE_CREATED_QUALIFICATION)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                prescriptionMonths: 'Debe ser un número entero mayor o igual a 1.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        conflict: response(409, ERRORS.legalQualificationNameTaken),
    },

    /** `GET /legal-qualifications` — cualquier usuario autenticado. */
    listLegalQualifications: {
        ok: response(
            200,
            listBody<LegalQualification>([EXAMPLE_QUALIFICATION], buildPagination(8, 1, 20)),
        ),
        invalidPagination: response(400, ERRORS.invalidPagination),
        unauthenticated: response(401, ERRORS.unauthenticated),
        empty: response(200, listBody<LegalQualification>([], buildPagination(0, 1, 20))),
    },

    /** `GET /legal-qualifications/{qualificationId}` */
    getLegalQualification: {
        ok: response(200, itemBody(EXAMPLE_QUALIFICATION)),
        invalidId: response(400, ERRORS.invalidLegalQualificationId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        notFound: response(404, ERRORS.legalQualificationNotFound),
    },

    /** `PATCH /legal-qualifications/{qualificationId}` */
    updateLegalQualification: {
        ok: response(200, itemBody(EXAMPLE_UPDATED_QUALIFICATION)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                name: 'No puede estar vacío.',
            }),
        ),
        invalidId: response(400, ERRORS.invalidLegalQualificationId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        notFound: response(404, ERRORS.legalQualificationNotFound),
        conflict: response(409, ERRORS.legalQualificationNameTaken),
    },

    /** `DELETE /legal-qualifications/{qualificationId}` — baja lógica; las causas la conservan. */
    deleteLegalQualification: {
        ok: NO_CONTENT,
        invalidId: response(400, ERRORS.invalidLegalQualificationId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        notFound: response(404, ERRORS.legalQualificationNotFound),
    },

    /** `POST /clients` — cualquier usuario autenticado (D-39). */
    createClient: {
        created: response(201, itemBody(EXAMPLE_CREATED_CLIENT)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                dni: 'Debe contener 7 u 8 dígitos, sin puntos.',
                email: 'El formato del correo electrónico no es válido.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        conflict: response(409, ERRORS.clientDniTaken),
    },

    /** `GET /clients` — cualquier usuario autenticado. */
    listClients: {
        ok: response(200, listBody<Client>([EXAMPLE_CLIENT], buildPagination(23, 1, 20))),
        invalidPagination: response(400, ERRORS.invalidPagination),
        unauthenticated: response(401, ERRORS.unauthenticated),
        empty: response(200, listBody<Client>([], buildPagination(0, 1, 20))),
    },

    /** `GET /clients/{clientId}` */
    getClient: {
        ok: response(200, itemBody(EXAMPLE_CLIENT)),
        invalidId: response(400, ERRORS.invalidClientId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        notFound: response(404, ERRORS.clientNotFound),
    },

    /** `POST /cases` — cualquier usuario autenticado. La causa nace en "Iniciada". */
    createCase: {
        created: response(201, itemBody(EXAMPLE_CREATED_CASE)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                sacNumber: 'Debe contener exactamente 8 dígitos.',
                proceduralRole: 'El rol procesal no corresponde al fuero.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        conflict: response(409, ERRORS.caseSacTaken),
    },

    /** `GET /cases` */
    listCases: {
        ok: response(200, listBody<Case>([EXAMPLE_CASE], buildPagination(23, 1, 20))),
        invalidFilter: response(
            400,
            errorBody('INVALID_REQUEST', 'Parámetros de query inválidos.', {
                withoutProceduralActs: 'No puede combinarse con proceduralStateId ni con customState.',
            }),
        ),
        invalidPagination: response(400, ERRORS.invalidPagination),
        unauthenticated: response(401, ERRORS.unauthenticated),
        empty: response(200, listBody<Case>([], buildPagination(0, 1, 20))),
    },

    /** `GET /cases/custom-states` — la única colección sin paginar. */
    listCustomStates: {
        ok: response(200, itemBody(['Con acusación, pero con oposición'])),
        invalidJurisdiction: response(400, ERRORS.invalidJurisdiction),
        unauthenticated: response(401, ERRORS.unauthenticated),
        empty: response(200, itemBody<string[]>([])),
    },

    /** `GET /cases/{caseId}` */
    getCase: {
        ok: response(200, itemBody(EXAMPLE_CASE)),
        invalidId: response(400, ERRORS.invalidCaseId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        notFound: response(404, ERRORS.caseNotFound),
    },

    /** `POST /cases/{caseId}/procedural-acts` — sólo el abogado responsable de la causa (D-30). */
    createProceduralAct: {
        created: response(201, itemBody(EXAMPLE_ACT)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                notificationDate:
                    'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).',
            }),
        ),
        invalidId: response(400, ERRORS.invalidCaseId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenNotResponsible),
        notFound: response(404, ERRORS.caseNotFound),
        terminalState: response(422, ERRORS.caseInTerminalState),
    },

    /** `GET /cases/{caseId}/procedural-acts/deadline-preview` — sólo el abogado responsable. */
    deadlinePreview: {
        ok: response(200, itemBody(EXAMPLE_PREVIEW)),
        /** Estado que no abre plazo: `dueDate` y `businessDaysRemaining` en `null`. */
        noTerm: response(200, itemBody(EXAMPLE_PREVIEW_NO_TERM)),
        invalidQuery: response(
            400,
            errorBody('INVALID_REQUEST', 'Parámetros de query inválidos.', {
                notificationDate:
                    'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenNotResponsible),
        notFound: response(404, ERRORS.caseNotFound),
    },

    /** `POST /cases/{caseId}/prescription` — `ADMINISTRATOR` o `LAWYER` (V4 §3.7, HU33). */
    declarePrescription: {
        ok: response(200, itemBody(EXAMPLE_PRESCRIBED_CASE)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                prescriptionDate: 'No puede ser posterior a hoy.',
                resolution: 'La resolución que declara la prescripción es obligatoria.',
            }),
        ),
        invalidId: response(400, ERRORS.invalidCaseId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenAdministratorOrLawyer),
        notFound: response(404, ERRORS.caseNotFound),
        notApplicable: response(422, ERRORS.prescriptionNotApplicable),
        terminalState: response(422, ERRORS.caseInTerminalStateOperation),
    },

    /** `POST /cases/{caseId}/folder` — cualquier usuario autenticado, idempotente (V4 §3.7). */
    createCaseFolder: {
        ok: response(200, itemBody(EXAMPLE_CASE.folder)),
        invalidId: response(400, ERRORS.invalidCaseId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        notFound: response(404, ERRORS.caseNotFound),
        /** La carpeta sigue pendiente: `EXAMPLE_PENDING_FOLDER`. */
        storageUnavailable: response(502, ERRORS.documentStorageUnavailable),
        pendingFolder: EXAMPLE_PENDING_FOLDER,
    },

    /** `POST /cases/{caseId}/interruptive-acts` — sólo el abogado responsable (V4 §3.9, HU31). */
    createInterruptiveAct: {
        created: response(201, itemBody(EXAMPLE_INTERRUPTIVE_ACT)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                name: 'El acto interruptivo es obligatorio.',
                actDate: 'No puede ser posterior a hoy.',
            }),
        ),
        invalidId: response(400, ERRORS.invalidCaseId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenNotResponsibleInterruptive),
        notFound: response(404, ERRORS.caseNotFound),
        notApplicable: response(422, ERRORS.prescriptionNotApplicable),
        terminalState: response(422, ERRORS.caseInTerminalStateOperation),
    },

    /** `GET /cases/{caseId}/interruptive-acts` — cualquier usuario autenticado. */
    listInterruptiveActs: {
        ok: response(200, listBody<InterruptiveAct>([EXAMPLE_INTERRUPTIVE_ACT], buildPagination(1, 1, 20))),
        empty: response(200, listBody<InterruptiveAct>([], buildPagination(0, 1, 20))),
        invalidPagination: response(400, ERRORS.invalidPagination),
        invalidId: response(400, ERRORS.invalidCaseId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        notFound: response(404, ERRORS.caseNotFound),
    },

    /** `POST /document-templates` — `ADMINISTRATOR` o `LAWYER`, `multipart/form-data` (V4 §3.10, HU34). */
    createDocumentTemplate: {
        created: response(201, itemBody({ ...EXAMPLE_TEMPLATE, id: 14, usageCount: 0 })),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                name: 'El nombre del modelo es obligatorio.',
                jurisdictions: 'Elegí al menos un fuero.',
                file: 'El archivo del modelo es obligatorio.',
            }),
        ),
        invalidFile: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                file: 'El archivo tiene que ser .docx.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenAdministratorOrLawyer),
        tooLarge: response(413, ERRORS.fileTooLarge),
        storageUnavailable: response(502, ERRORS.documentStorageUnavailable),
    },

    /** `GET /document-templates` — `ADMINISTRATOR` o `LAWYER`, por nombre (HU35). */
    listDocumentTemplates: {
        ok: response(200, listBody<DocumentTemplate>([EXAMPLE_TEMPLATE], buildPagination(6, 1, 20))),
        empty: response(200, listBody<DocumentTemplate>([], buildPagination(0, 1, 20))),
        invalidJurisdiction: response(400, ERRORS.invalidJurisdiction),
        invalidPagination: response(400, ERRORS.invalidPagination),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenAdministratorOrLawyer),
    },

    /** `GET /document-templates/{templateId}` y `…/file` — `ADMINISTRATOR` o `LAWYER`. */
    getDocumentTemplate: {
        ok: response(200, itemBody(EXAMPLE_TEMPLATE)),
        invalidId: response(400, ERRORS.invalidDocumentTemplateId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenAdministratorOrLawyer),
        notFound: response(404, ERRORS.documentTemplateNotFound),
        /** Sólo la descarga del archivo. */
        storageUnavailable: response(502, ERRORS.documentStorageUnavailable),
    },

    /** `GET /dashboards/lawyer` — `LAWYER` (V4 §3.11, HU41). */
    lawyerDashboard: {
        ok: response(200, itemBody(EXAMPLE_LAWYER_DASHBOARD)),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, forbiddenFor('LAWYER')),
    },

    /** `GET /dashboards/administrator` — `ADMINISTRATOR` (V4 §3.11, HU42). */
    administratorDashboard: {
        ok: response(200, itemBody(EXAMPLE_ADMINISTRATOR_DASHBOARD)),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, forbiddenFor('ADMINISTRATOR')),
    },

    /** Respuestas generales (§5.2). */
    general: {
        notFound: response(404, ERRORS.resourceNotFound),
        internalError: response(500, ERRORS.internalError),
    },
} as const;
