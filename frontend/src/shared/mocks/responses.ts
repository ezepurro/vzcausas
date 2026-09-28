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
    type ErrorBody,
    type Lawyer,
    type ProceduralState,
    type Session,
    type User,
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
 * el token y la del resto no. El 403, en cambio, quedó unificado.
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
    forbidden: errorBody(
        'FORBIDDEN',
        'Se requiere el rol ADMINISTRATOR para realizar esta operación.',
    ),

    /* ---- 404 ---- */
    userNotFound: errorBody('USER_NOT_FOUND', 'No se encontró el usuario solicitado.'),
    lawyerNotFound: errorBody('LAWYER_NOT_FOUND', 'No se encontró el abogado solicitado.'),
    proceduralStateNotFound: errorBody(
        'PROCEDURAL_STATE_NOT_FOUND',
        'No se encontró el estado procesal solicitado.',
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
    proceduralStateHasDependencies: errorBody(
        'PROCEDURAL_STATE_HAS_DEPENDENCIES',
        'No se puede dar de baja el estado procesal porque posee causas asociadas.',
    ),

    /* ---- 422 ---- */
    invalidCurrentPassword: errorBody(
        'INVALID_CURRENT_PASSWORD',
        'La contraseña actual es incorrecta.',
    ),

    /* ---- 500 ---- */
    internalError: errorBody('INTERNAL_SERVER_ERROR', 'Ocurrió un error interno inesperado.'),
} satisfies Record<string, ErrorBody>;

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
    createProceduralState: 'registrar el estado procesal',
    updateProceduralState: 'modificar el estado procesal',
    deleteProceduralState: 'dar de baja el estado procesal',
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
    activeCases: 0,
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
    position: 4,
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
    activeCases: 0,
    active: true,
};

/** Estado terminal y sin plazo: el caso que el prototipo muestra con `—`. */
const EXAMPLE_TERMINAL_STATE: ProceduralState = {
    id: 9,
    name: 'Archivada',
    jurisdiction: 'CRIMINAL',
    position: 9,
    timeLimitDays: 0,
    dayType: 'NONE',
    terminal: true,
    activeCases: 0,
    active: true,
};

const EXAMPLE_CREATED_STATE: ProceduralState = {
    id: 25,
    name: 'Vista al fiscal',
    jurisdiction: 'CRIMINAL',
    position: 5,
    timeLimitDays: 5,
    dayType: 'BUSINESS',
    terminal: false,
    activeCases: 0,
    active: true,
};

const EXAMPLE_UPDATED_STATE: ProceduralState = {
    ...EXAMPLE_CREATED_STATE,
    timeLimitDays: 20,
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

    /** `GET /lawyers` */
    listLawyers: {
        ok: response(200, listBody<Lawyer>([EXAMPLE_LAWYER], buildPagination(7, 1, 20))),
        invalidPagination: response(400, ERRORS.invalidPagination),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
        empty: response(200, listBody<Lawyer>([], buildPagination(0, 1, 20))),
    },

    /** `GET /lawyers/{lawyerId}` */
    getLawyer: {
        ok: response(200, itemBody(EXAMPLE_LAWYER)),
        invalidId: response(400, ERRORS.invalidLawyerId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
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
        businessRule: response(422, businessRuleViolation('createProceduralState')),
    },

    /** `GET /procedural-states` */
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
        forbidden: response(403, ERRORS.forbidden),
        empty: response(200, listBody<ProceduralState>([], buildPagination(0, 1, 20))),
    },

    /** `GET /procedural-states/{stateId}` */
    getProceduralState: {
        ok: response(200, itemBody(EXAMPLE_STATE)),
        invalidId: response(400, ERRORS.invalidProceduralStateId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
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
        businessRule: response(422, businessRuleViolation('updateProceduralState')),
    },

    /** `DELETE /procedural-states/{stateId}` — baja lógica. */
    deleteProceduralState: {
        ok: NO_CONTENT,
        invalidId: response(400, ERRORS.invalidProceduralStateId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbidden),
        notFound: response(404, ERRORS.proceduralStateNotFound),
        hasDependencies: response(409, ERRORS.proceduralStateHasDependencies),
        businessRule: response(422, businessRuleViolation('deleteProceduralState')),
    },

    /** Respuestas generales (§5.2). */
    general: {
        notFound: response(404, ERRORS.resourceNotFound),
        internalError: response(500, ERRORS.internalError),
    },
} as const;
