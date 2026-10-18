import type { PaginatedQuery } from '@/api-contract/envelopes'


export const ROLES = ['ADMINISTRATOR', 'LAWYER', 'SECRETARY'] as const

export type Role = (typeof ROLES)[number]

/**
 * La ficha profesional tal como viene embebida adentro del usuario.
 * El contrato manda el objeto y no sólo el id justamente para que la tabla
 * pueda mostrar el nombre sin salir a buscar un abogado por fila.
 */
export interface EmbeddedLawyer {
    id: number
    /** Desde V4 el apellido y los nombres van separados (D-68). */
    lastName: string
    firstName: string
    registrationNumber: string
}

/** El Usuario tal como viene adentro de `data`. */
export interface User {
    id: number
    username: string
    /** Apellido. Desde V4 reemplaza a `fullName` (D-68). */
    lastName: string
    /** Nombres. */
    firstName: string
    email: string

    /** Siempre arreglo, con al menos un rol, un Usuario puede tener mas de un unico Rol. */
    roles: Role[]

    /** `null` cuando el usuario no tiene ficha profesional (secretaría). */
    lawyer: EmbeddedLawyer | null

    /**`null` si nunca inició sesión. */
    lastLoginAt: string | null

    /** Estado de alta. La baja es lógica: el `DELETE` lo pone en `false`. */
    active: boolean
}

/** Los datos de un abogado que se registra junto con el usuario. */
export interface NewLawyerBody {
    lastName: string
    firstName: string
    registrationNumber: string
}

/**
 * Cuerpo del `POST /users`.
 *
 * `lawyerId` y `lawyer` son mutuamente excluyentes: se manda uno o el
 * otro, nunca los dos. Mandar `lawyer` hace que el backend registre la ficha
 * y el usuario en una única transacción, así un fallo a mitad de camino no
 * deja un abogado huérfano que desde el cliente no se puede borrar.
 */
export interface CreateUserBody {
    username: string
    lastName: string
    firstName: string
    email: string
    password: string
    roles: Role[]

    /** Vincular una ficha ya registrada. */
    lawyerId?: number

    /** Registrar una ficha nueva en la misma operación. */
    lawyer?: NewLawyerBody
}

/**
 * Cuerpo del `PATCH /users/{id}`: todo opcional, pero hay que mandar al menos
 * un campo. De eso se ocupa `buildUserPatch`.
 */
export interface UpdateUserBody {
    username?: string
    lastName?: string
    firstName?: string
    email?: string
    /** Reemplaza el conjunto **completo** de roles. */
    roles?: Role[]
    /** `null` desvincula la ficha profesional. */
    lawyerId?: number | null
}

/**
 * Las dos formas de resolver la ficha profesional en el alta, con el rótulo
 * que muestra el select. Son las mismas dos del prototipo, y se corresponden
 * una a una con el `lawyerId` / `lawyer` del contrato.
 */
export const LAWYER_MODES = {
    link: 'Vincular un abogado ya registrado',
    create: 'Registrar un abogado nuevo',
} as const

/**
 * Los valores del formulario.
 *
 * Sólo `string`, que es lo que admite `FormValues` de `FormModal`. Nunca
 * `undefined`: un campo vacío es `''`, no ausencia. Por eso `role` es
 * `string` pelado y no `Role`: mientras está en el formulario tiene el
 * rótulo del select, y recién `utils/roles` decide si corresponde a alguno.
 *
 * Declarado con `type` y no con `interface` para que sea asignable a
 * `FormValues`, igual que en `legal-params`.
 */
export type UserFormValues = {
    lastName: string
    firstName: string
    username: string
    email: string
    password: string
    passwordConfirm: string
    /**
     * Un booleano por rol. El contrato guarda un arreglo y una persona puede
     * tener más de uno; `FormValues` sólo admite `string` o `boolean`, así
     * que el arreglo se arma recién al enviar.
     */
    roleAdministrator: boolean
    roleLawyer: boolean
    roleSecretary: boolean
    /** Uno de los dos rótulos de `LAWYER_MODES`. */
    lawyerMode: string
    /** Id de la ficha a vincular, como string: sale de un select. */
    lawyerId: string
    /** Matrícula de la ficha nueva, con el formato `1-28114`. */
    registrationNumber: string
}

/** Parámetros del listado `GET /users`. Van también en la clave de caché. */
export interface UserListParams extends PaginatedQuery {
    /** Filtra por `username`, `lastName` y `firstName`. */
    search?: string
    role?: Role
}
