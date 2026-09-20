/**
 * Respuestas de ejemplo, una por cada código documentado en el contrato.
 *
 * Son los cuerpos literales del documento. Sirven para dos cosas:
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
    type LoginErrorBody,
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
 * Ojo con los dos matices que el documento distingue y acá se conservan:
 * el 401 de `/auth/*` menciona el token y el de `/users` no; el 403 de
 * `POST /users` habla de "permisos suficientes" y el resto nombra el rol.
 */
export const ERRORS = {
    /** 401 de `/auth/logout` y `/auth/password`. */
    unauthenticatedAuth: errorBody(
        'UNAUTHENTICATED',
        'La autenticación es requerida o el token proporcionado no es válido.',
    ),
    /** 401 del resto de los endpoints protegidos. */
    unauthenticated: errorBody('UNAUTHENTICATED', 'La autenticación es requerida.'),
    /** 403 de `POST /users`. */
    forbiddenNoPermissions: errorBody(
        'FORBIDDEN',
        'El usuario no posee permisos suficientes para realizar esta operación.',
    ),
    /** 403 del resto de los endpoints de administración. */
    forbiddenNotAdmin: errorBody(
        'FORBIDDEN',
        'Se requiere el rol ADMINISTRADOR para realizar esta operación.',
    ),
    userNotFound: errorBody('USER_NOT_FOUND', 'No se encontró el usuario solicitado.'),
    usernameTaken: errorBody(
        'USERNAME_ALREADY_EXISTS',
        'El nombre de usuario ya se encuentra registrado.',
    ),
    registrationTaken: errorBody(
        'LAWYER_REGISTRATION_ALREADY_EXISTS',
        'La matrícula del abogado ya se encuentra registrada.',
    ),
    userHasDependencies: errorBody(
        'USER_HAS_DEPENDENCIES',
        'No se puede eliminar el usuario porque posee recursos asociados.',
    ),
    invalidUserId: errorBody(
        'INVALID_PATH_PARAMETER',
        'El identificador del usuario no es válido.',
        { userId: 'Debe ser un número entero válido.' },
    ),
    invalidPagination: errorBody(
        'INVALID_PAGINATION',
        'Los parámetros de paginación no son válidos.',
        {
            page: 'Debe ser un número entero mayor o igual a 1.',
            limit: 'Debe ser un número entero entre 1 y 100.',
        },
    ),
    invalidJurisdiction: errorBody('INVALID_REQUEST', 'Parametros de query inválidos', {
        jurisdiction: 'No existe un fuero procesal con ese nombre',
    }),
    invalidCurrentPassword: errorBody(
        'INVALID_CURRENT_PASSWORD',
        'La contraseña actual es incorrecta.',
    ),
        proceduralStateNameTaken: errorBody(
        'PROCEDURAL_STATE_ALREADY_EXISTS',
        'Ya existe un estado procesal con ese nombre en el fuero indicado.',
    ),
    proceduralStateHasDependencies: errorBody(
        'PROCEDURAL_STATE_HAS_DEPENDENCIES',
        'No se puede eliminar el estado procesal porque posee causas asociadas.',
    ),
    proceduralStateNotFound: errorBody(
        'RESOURCE_NOT_FOUND',
        'No se encontró el estado procesal solicitado.',
    ),
    invalidProceduralStateId: errorBody(
        'INVALID_PATH_PARAMETER',
        'El identificador del estado procesal no es válido.',
        { proceduralStateId: 'Debe ser un número entero válido.' },
    ),
    resourceNotFound: errorBody('RESOURCE_NOT_FOUND', 'No se encontró el recurso solicitado.'),
    internalError: errorBody('INTERNAL_SERVER_ERROR', 'Ocurrió un error interno inesperado.'),
} satisfies Record<string, ErrorBody>;

/**
 * Fragmento en castellano del `422` de cada operación (§2.2, §2.3).
 * La clave es en inglés; el texto es el del contrato.
 */
const BUSINESS_RULE_TEXT = {
    createUser: 'registrar el usuario',
    updateUser: 'modificar el usuario',
    deleteUser: 'eliminar el usuario',
    createLawyer: 'registrar el abogado',
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

const EXAMPLE_SESSION: Session = {
    accessToken: 'eyJhbGciOi...',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: { id: 1, username: 'admin', role: 'ADMINISTRADOR' },
};

const EXAMPLE_CREATED_USER: User = { id: 15, username: 'jperez', role: ['LAWYER', 'ADMINISTATOR'] };

const EXAMPLE_CREATED_LAWYER: Lawyer = {
    id: 10,
    firstName: 'Juan',
    lastName: 'Pérez',
    registrationNumber: 'MP-12345',
    email: 'juan.perez@example.com',
    phone: '351249249',
};

const EXAMPLE_CREATED_STATE: ProceduralState = {
    id: 25,
    name: 'Vista al fiscal',
    jurisdiction: 'CRIMINAL',
    proceduralTimeLimit: '5',
    dayType: 'BUSINESS',
};

const EXAMPLE_UPDATED_STATE: ProceduralState = {
    ...EXAMPLE_CREATED_STATE,
    proceduralTimeLimit: '20',
};


const EXAMPLE_STATES: ProceduralState[] = [
    { id: 1, name: 'ALLEGATION', jurisdiction: 'ADMINISTRATIVE', proceduralTimeLimit: '10', dayType: 'BUSINESS' },
    { id: 15, name: 'INVESTIGATION', jurisdiction: 'CRIMINAL', proceduralTimeLimit: '150', dayType: 'CONSECUTIVE' },
];

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
        /**
         * DIVERGENCIA: el único error del contrato sin el envoltorio
         * `{ error: { code, message, details } }`.
         */
        invalidCredentials: response(401, {
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Credenciales inválidas',
        } satisfies LoginErrorBody),
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
        forbidden: response(403, ERRORS.forbiddenNoPermissions),
        conflict: response(409, ERRORS.usernameTaken),
        businessRule: response(422, businessRuleViolation('createUser')),
    },

    /** `GET /users` */
    listUsers: {
        ok: response(
            200,
            listBody<User>(
                [
                    { id: 1, username: 'admin', role: ['LAWYER', 'ADMINISTATOR'] },
                    { id: 15, username: 'jperez', role: ['LAWYER'] },
                ],
                { page: 1, limit: 20, totalItems: 57, totalPages: 3 },
            ),
        ),
        invalidPagination: response(400, ERRORS.invalidPagination),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenNotAdmin),
        /** Colección vacía: lo que devuelve un `search` sin resultados. */
        empty: response(200, listBody<User>([], buildPagination(0, 1, 20))),
    },

    /** `GET /users/{userId}` */
    getUser: {
        ok: response(200, itemBody<User>({ id: 15, username: 'mdominguez', role: ['SECRETARIAT'] })),
        invalidId: response(400, ERRORS.invalidUserId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenNotAdmin),
        notFound: response(404, ERRORS.userNotFound),
    },

    /** `PATCH /users/{userId}` */
    updateUser: {
        ok: response(200, itemBody<User>({ id: 15, username: 'juanperez', role: ['LAWYER'] })),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                username: 'El nombre de usuario no cumple con el formato requerido.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenNotAdmin),
        notFound: response(404, ERRORS.userNotFound),
        conflict: response(409, ERRORS.usernameTaken),
        businessRule: response(422, businessRuleViolation('updateUser')),
    },

    /** `DELETE /users/{userId}` */
    deleteUser: {
        ok: NO_CONTENT,
        invalidId: response(400, ERRORS.invalidUserId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenNotAdmin),
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
        forbidden: response(403, ERRORS.forbiddenNotAdmin),
        conflict: response(409, ERRORS.registrationTaken),
        businessRule: response(422, businessRuleViolation('createLawyer')),
    },

    /** `GET /procedural-states` */
    listProceduralStates: {
        ok: response(
            200,
            listBody(EXAMPLE_STATES, { page: 1, limit: 20, totalItems: 57, totalPages: 3 }),
        ),
        invalidJurisdiction: response(400, ERRORS.invalidJurisdiction),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenNotAdmin),
        empty: response(200, listBody<ProceduralState>([], buildPagination(0, 1, 20))),
    },

        /** `POST /procedural-states` — PROPUESTA, no está en el contrato v1. */
    createProceduralState: {
        created: response(201, itemBody(EXAMPLE_CREATED_STATE)),
        validation: response(
            400,
            errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                proceduralTimeLimit: 'Debe ser un número entero mayor o igual a 0.',
            }),
        ),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenNotAdmin),
        conflict: response(409, ERRORS.proceduralStateNameTaken),
    },

    /** `PATCH /procedural-states/{proceduralStateId}` — PROPUESTA. */
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
        forbidden: response(403, ERRORS.forbiddenNotAdmin),
        notFound: response(404, ERRORS.proceduralStateNotFound),
        conflict: response(409, ERRORS.proceduralStateNameTaken),
    },

    /** `DELETE /procedural-states/{proceduralStateId}` — PROPUESTA. */
    deleteProceduralState: {
        ok: NO_CONTENT,
        invalidId: response(400, ERRORS.invalidProceduralStateId),
        unauthenticated: response(401, ERRORS.unauthenticated),
        forbidden: response(403, ERRORS.forbiddenNotAdmin),
        notFound: response(404, ERRORS.proceduralStateNotFound),
        hasDependencies: response(409, ERRORS.proceduralStateHasDependencies),
    },


    /** Respuestas generales (§4.2). */
    general: {
        notFound: response(404, ERRORS.resourceNotFound),
        internalError: response(500, ERRORS.internalError),
    },
} as const;
