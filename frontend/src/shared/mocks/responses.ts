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
    type Case,
    type Client,
    type DeadlinePreview,
    type ErrorBody,
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

    /* ---- 401 ---- */
    /** Credenciales incorrectas. Sólo en el login. */
    invalidCredentials: errorBody(
        'INVALID_CREDENTIALS',
        'Las credenciales proporcionadas no son válidas.',
    ),
    /** 401 de `/auth/logout` y `/auth/password`. */
    unauthenticatedAuth: errorBody(
        'UNAUTHENTICATED',
        'La autenticación es requerida o el token proporcionado no es válido.',
    ),
    /** 401 del resto de los endpoints protegidos. */
    unauthenticated: errorBody('UNAUTHENTICATED', 'La autenticación es requerida.'),

    /* ---- 403 ---- */
    /** Administración: usuarios, abogados, estados y calificaciones. */
    forbidden: forbiddenFor('ADMINISTRATOR'),
    /** Alta de cliente (D-05). */
    forbiddenSecretary: forbiddenFor('SECRETARY'),
    /** Registro de un acto procesal y su previsualización (D-30). */
    forbiddenNotResponsible: errorBody(
        'FORBIDDEN',
        'Solo el abogado responsable de la causa puede registrar actos procesales.',
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

    /* ---- 422 ---- */
    invalidCurrentPassword: errorBody(
        'INVALID_CURRENT_PASSWORD',
        'La contraseña actual es incorrecta.',
    ),
    proceduralStateInUse: errorBody(
        'PROCEDURAL_STATE_IN_USE',
        'El estado procesal está registrado en causas y no puede cambiar de fuero.',
    ),
    caseInTerminalState: errorBody(
        'CASE_IN_TERMINAL_STATE',
        'La causa se encuentra en un estado terminal y no admite actos procesales.',
    ),

    /* ---- 500 ---- */
    internalError: errorBody('INTERNAL_SERVER_ERROR', 'Ocurrió un error interno inesperado.'),
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
    fullName: 'Ignacio Peralta',
    email: 'iperalta@vazquezzarate.com',
    roles: ['LAWYER'],
    lawyer: { id: 4, fullName: 'Dr. Ignacio Peralta', registrationNumber: '1-35207' },
    lastLoginAt: '2026-09-18T18:20:00-03:00',
    active: true,
};

const EXAMPLE_ADMIN: User = {
    id: 1,
    username: 'fvazquez',
    fullName: 'Fernando G. Vázquez',
    email: 'fvazquez@vazquezzarate.com',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    lawyer: { id: 1, fullName: 'Dr. Fernando G. Vázquez', registrationNumber: '1-28114' },
    lastLoginAt: '2026-09-19T08:12:00-03:00',
    active: true,
};

/** Usuario de secretaría: sin ficha profesional. */
const EXAMPLE_SECRETARY: User = {
    id: 8,
    username: 'gestion',
    fullName: 'Gestión Estudio',
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
    fullName: 'Juan Pérez',
    email: 'jperez@vazquezzarate.com',
    roles: ['LAWYER'],
    lawyer: { id: 8, fullName: 'Dr. Juan Pérez', registrationNumber: '1-42088' },
    lastLoginAt: null,
    active: true,
};

const EXAMPLE_LAWYER: Lawyer = {
    id: 4,
    fullName: 'Dr. Ignacio Peralta',
    registrationNumber: '1-35207',
    activeCases: 2,
    active: true,
};

const EXAMPLE_CREATED_LAWYER: Lawyer = {
    id: 8,
    fullName: 'Dr. Juan Pérez',
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
    activeCases: 1,
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
    activeCases: 0,
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
    proceduralRole: 'DEFENSE',
    instructorName: 'Dra. Verónica Ledesma',
    instructorPhone: '0351 448-1200',
    instructorExtension: '214',
    counterparty: null,
    subjectMatter: null,
    client: {
        id: 1,
        lastName: 'GÓMEZ',
        firstName: 'Ariel Fernando',
        dni: '34812905',
        phone: '351 415-2288',
        email: 'afgomez@gmail.com',
        clientSince: '2021-03-12',
    },
    responsibleLawyer: { id: 3, fullName: 'Dra. Malena Ríos', registrationNumber: '1-36842' },
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
    active: true,
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
    registeredBy: { id: 3, fullName: 'Malena Ríos' },
    registeredAt: '2026-09-09T11:42:00-03:00',
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
        ok: response(200, itemBody({ ...EXAMPLE_LAWYER, fullName: 'Dr. I. Peralta' })),
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
        forbidden: response(403, ERRORS.forbidden),
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
        forbidden: response(403, ERRORS.forbidden),
        notFound: response(404, ERRORS.proceduralStateNotFound),
        conflict: response(409, ERRORS.proceduralStateNameTaken),
        /** Cambio de fuero de un estado que alguna causa registra (D-07). */
        inUse: response(422, ERRORS.proceduralStateInUse),
    },

    /**
     * `DELETE /procedural-states/{stateId}` — baja lógica. Procede aunque haya
     * causas en el estado: lo conservan (D-06). Ya no hay `409`.
     */
    deleteProceduralState: {
        ok: NO_CONTENT,
        invalidId: response(400, ERRORS.invalidProceduralStateId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
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
        forbidden: response(403, ERRORS.forbidden),
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
        forbidden: response(403, ERRORS.forbidden),
        notFound: response(404, ERRORS.legalQualificationNotFound),
        conflict: response(409, ERRORS.legalQualificationNameTaken),
    },

    /** `DELETE /legal-qualifications/{qualificationId}` — baja lógica; las causas la conservan. */
    deleteLegalQualification: {
        ok: NO_CONTENT,
        invalidId: response(400, ERRORS.invalidLegalQualificationId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
        notFound: response(404, ERRORS.legalQualificationNotFound),
    },

    /** `POST /clients` — sólo `SECRETARY` (D-05). */
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
        forbidden: response(403, ERRORS.forbiddenSecretary),
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

    /** Respuestas generales (§5.2). */
    general: {
        notFound: response(404, ERRORS.resourceNotFound),
        internalError: response(500, ERRORS.internalError),
    },
} as const;
