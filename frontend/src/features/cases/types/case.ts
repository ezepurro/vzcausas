/**
 * Causa: las formas sacadas del contrato (V4 §3.7).
 *
 * Escrito a partir del contrato, no copiado de `shared/mocks`.
 *
 * V4 suma a la causa los datos propios de cada fuero y la tasa de justicia
 * (D-67), el vencimiento del acto lesivo del amparo (D-78), la prescripción ya
 * calculada (D-51), la constancia de prescripción (HU33) y la carpeta en la
 * nube (HU39). Las personas embebidas traen apellido y nombres por separado
 * (D-68).
 */

import type { PaginatedQuery } from '@/api-contract/envelopes'
import type { Client } from '@/features/clients'
import type { DayType, Jurisdiction } from '@/features/legal-params'

/**
 * Posición del cliente en la causa (V3 §2). No confundir con `Role`, que es el
 * perfil de seguridad del usuario.
 */
export const PROCEDURAL_ROLES = [
    'DEFENSA',
    'QUERELLANTE_PARTICULAR',
    'RECURRENTE',
    'ACTORA',
    'DEMANDADA',
] as const
export type ProceduralRole = (typeof PROCEDURAL_ROLES)[number]

export const PROCEDURAL_ROLE_LABELS: Record<ProceduralRole, string> = {
    DEFENSA: 'Defensa',
    QUERELLANTE_PARTICULAR: 'Querellante particular',
    RECURRENTE: 'Recurrente',
    ACTORA: 'Actora',
    DEMANDADA: 'Demandada',
}

/**
 * Qué roles admite cada fuero, en el orden del prototipo. El primero es el
 * que queda elegido al cambiar de fuero. El backend rechaza con `400` un rol
 * que no corresponda.
 */
export const PROCEDURAL_ROLES_BY_JURISDICTION: Record<Jurisdiction, readonly ProceduralRole[]> = {
    CRIMINAL: ['DEFENSA', 'QUERELLANTE_PARTICULAR'],
    ADMINISTRATIVE: ['DEFENSA', 'RECURRENTE'],
    AMPARO: ['ACTORA', 'DEMANDADA'],
}

/** El cliente tal como viene embebido en la causa: sin `activeCases` ni `active`. */
export type CaseClient = Pick<
    Client,
    'id' | 'lastName' | 'firstName' | 'dni' | 'phone' | 'email' | 'clientSince'
>

/** El abogado responsable embebido (RN3). Apellido y nombres separados (V4 D-68). */
export interface CaseLawyer {
    id: number
    lastName: string
    firstName: string
    registrationNumber: string
}

/**
 * Una calificación de la causa, con su fecha del hecho y su prescripción ya
 * calculada por el backend. Cada una prescribe por su lado (V3 D-19).
 */
export interface CaseLegalQualification {
    id: number
    name: string
    prescriptionMonths: number
    /** Fecha del hecho imputado bajo esta calificación, `YYYY-MM-DD`. La carga el usuario. */
    offenseDate: string
    /**
     * Desde cuándo se computa la prescripción, `YYYY-MM-DD`: la fecha del acto
     * interruptivo más reciente o, si no hay ninguno, `offenseDate` (V4 D-49).
     */
    prescriptionStartsOn: string
    /** `prescriptionStartsOn` más `prescriptionMonths`, `YYYY-MM-DD`. */
    prescriptionExpiresOn: string
}

/**
 * El estado al que un acto procesal llevó la causa. Es sólo la denominación:
 * el vencimiento del acto va aparte, en su propia respuesta (V3 §3.8).
 */
export interface ResultingState {
    /** `null` si el estado fue escrito a mano en el acto. */
    proceduralStateId: number | null
    name: string
    /** `true` si es un estado escrito a mano para esta causa. */
    custom: boolean
}

/**
 * El estado actual de la causa, con el vencimiento que abrió el acto que la
 * llevó hasta él (V3 D-35: ya no existe `nextDeadline`).
 *
 * **Nunca es `null`** (D-34): una causa recién registrada está en el estado
 * inicial de su fuero, "Iniciada", con `initial` en `true` y sin vencimiento.
 */
export interface CurrentState extends ResultingState {
    /** `true` si es el estado inicial del fuero. */
    initial: boolean
    /** El acto que la llevó a este estado. `null` en el estado inicial. */
    proceduralActId: number | null
    /** `YYYY-MM-DD`, o `null` si no hay plazo abierto: es una causa "para impulsar". */
    dueDate: string | null
    /** Días hábiles hasta `dueDate`: `0` vence hoy, negativo ya vencido. `null` sin plazo. */
    businessDaysRemaining: number | null
    /** `true` si el vencimiento se ajustó a mano al registrar el acto. */
    manuallyAdjusted: boolean
}

/**
 * La prescripción que rige la causa: la de la calificación que prescribe
 * primero, ya calculada por el backend (V4 D-51). `null` fuera del penal y en
 * una causa penal sin calificaciones (D-74).
 */
export interface CasePrescription {
    legalQualificationId: number
    legalQualificationName: string
    /** `YYYY-MM-DD`: su `prescriptionStartsOn`. */
    startsOn: string
    /** `YYYY-MM-DD`: su `prescriptionExpiresOn`. */
    expiresOn: string
    /** De `0` a `100`, redondeado. */
    elapsedPercentage: number
    /** `true` desde el 70 % del plazo: "próxima a prescribir". Lo evalúa el backend. */
    alert: boolean
    /** `true` si hoy es igual o posterior a `expiresOn`. No cambia el estado de la causa. */
    expired: boolean
    /** El acto interruptivo que reinició el cómputo, `YYYY-MM-DD`. `null` si corre desde el hecho. */
    lastInterruptiveActDate: string | null
}

/** Constancia de que la causa fue marcada como prescripta (HU33). */
export interface PrescriptionDeclaration {
    prescriptionDate: string
    resolution: string
    grounds: string | null
    registeredBy: { id: number; lastName: string; firstName: string }
    registeredAt: string
}

/**
 * El vencimiento para presentar el amparo desde el acto lesivo (V4 D-78). Solo
 * en `AMPARO`, con fecha del acto lesivo y mientras la causa está en "Iniciada".
 * Tiene `dueDate` y `businessDaysRemaining`, igual que el estado actual, así
 * que se muestra con el mismo chip.
 */
export interface HarmfulActDeadline {
    /** La fecha cargada o, si se renueva, la última renovación que no supera hoy. */
    actDate: string
    /** `true` si `actDate` es una renovación. */
    renewed: boolean
    dueDate: string
    businessDaysRemaining: number
}

/** Situación de la carpeta de la causa en la nube (V4 §2). */
export type CaseFolderStatus = 'CREATED' | 'PENDING'

/** Carpeta de la causa en la nube (HU39). `null` si no se pidió crearla. */
export interface CaseFolder {
    status: CaseFolderStatus
    /** `null` mientras está `PENDING`. */
    url: string | null
    path: string
    templatesCopied: number
    templatesPending: number
}

/** El recurso tal como viene adentro de `data`. El listado y el detalle devuelven lo mismo. */
export interface Case {
    id: number
    /**
     * 8 dígitos. Si se informa, identifica la causa en todo el sistema (RN2).
     * `null` mientras el Poder Judicial no lo haya asignado (D-33).
     */
    sacNumber: string | null
    /** Carátula. */
    caption: string
    court: string | null
    jurisdiction: Jurisdiction
    proceduralRole: ProceduralRole
    instructorName: string | null
    /** Sólo el teléfono del instructor: el interno va en `instructorExtension`. */
    tribunalPhone: string | null
    /** Número de interno del instructor (D-33). */
    instructorExtension: string | null
    /** Contraparte u organismo. `null` en el fuero penal. */
    counterparty: string | null
    /** Objeto del reclamo o del amparo (D-27). `null` en el fuero penal. */
    subjectMatter: string | null
    /** "Preso". Solo en `CRIMINAL`; `null` en los demás fueros (V4 D-67, D-80). */
    clientDetained: boolean | null
    /** Si el juez hizo lugar a la medida cautelar. Solo en `AMPARO`. */
    injunctionGranted: boolean | null
    /** Fecha del acto lesivo, `YYYY-MM-DD`. Solo en `AMPARO`; `null` si no se informó. */
    harmfulActDate: string | null
    /** Si el acto lesivo se renueva. Solo en `AMPARO`. */
    harmfulActRenews: boolean | null
    /** Cada cuántos días corridos se renueva. Solo si `harmfulActRenews`. */
    harmfulActRenewalDays: number | null
    /** Plazo para presentar el amparo desde el acto lesivo, en días. */
    harmfulActTermDays: number | null
    /** `BUSINESS` o `CONSECUTIVE`. */
    harmfulActTermDayType: DayType | null
    /** Calculado por el backend. Ver `HarmfulActDeadline`. */
    harmfulActDeadline: HarmfulActDeadline | null
    /** Agotamiento de la vía administrativa, `YYYY-MM-DD`. Solo en `ADMINISTRATIVE`. */
    administrativeRemedyExhaustedOn: string | null
    /** Si se pagó la tasa de justicia (RN10). En los tres fueros. */
    courtFeePaid: boolean
    client: CaseClient
    responsibleLawyer: CaseLawyer
    /** Opcional en el penal (D-33); vacío en los demás fueros. */
    legalQualifications: CaseLegalQualification[]
    /** La que rige la causa, calculada por el backend (V4 D-51). */
    prescription: CasePrescription | null
    /** `null` mientras la causa no fue marcada como prescripta. */
    prescriptionDeclaration: PrescriptionDeclaration | null
    /**
     * `YYYY-MM-DD`. `null` mientras la causa no tiene SAC (D-38). No interviene
     * en la prescripción: esa corre desde la fecha del hecho.
     */
    startDate: string | null
    /** Nunca `null`: la causa nace en "Iniciada" (D-34). Ver `utils/caseState`. */
    currentState: CurrentState
    /** `null` si no se pidió crearla, y en las causas registradas antes de V4. */
    folder: CaseFolder | null
    active: boolean
}

/** Una calificación en el cuerpo del alta: cuál es y cuándo fue el hecho. */
export interface CaseQualificationBody {
    legalQualificationId: number
    /** `YYYY-MM-DD`. Obligatoria (D-28) y no posterior a hoy. */
    offenseDate: string
}

/**
 * Cuerpo del `POST /cases`. `legalQualifications` va sólo en el penal, y ahí es
 * opcional (D-33); `counterparty` y `subjectMatter`, sólo en los otros dos
 * fueros. Mandar cualquiera donde no corresponde es un `400`.
 */
export interface CreateCaseBody {
    /** Opcional (D-33). Si se manda, 8 dígitos y único en todo el sistema. */
    sacNumber?: string
    jurisdiction: Jurisdiction
    caption: string
    court?: string
    instructorName?: string
    tribunalPhone?: string
    /** El interno del instructor, hasta 20 caracteres. */
    instructorExtension?: string
    clientId: number
    proceduralRole: ProceduralRole
    legalQualifications?: CaseQualificationBody[]
    counterparty?: string
    /** Obligatorio fuera del penal, hasta 800 caracteres. */
    subjectMatter?: string
    responsibleLawyerId: number
    /** Obligatoria si va `sacNumber`; sin SAC no se manda (CA-18.2). No puede ser posterior a hoy. */
    startDate?: string
    /* Datos propios de cada fuero (V4 D-67). Un dato de otro fuero no se manda. */
    /** Solo en `CRIMINAL`. Por defecto, `false`. */
    clientDetained?: boolean
    /** Solo en `AMPARO`. Por defecto, `false`. */
    injunctionGranted?: boolean
    /** Solo en `AMPARO`. No posterior a hoy. */
    harmfulActDate?: string
    /** Solo en `AMPARO`. Por defecto, `false`. */
    harmfulActRenews?: boolean
    /** Obligatorio si `harmfulActRenews` es `true`. Entero mayor o igual a 1. */
    harmfulActRenewalDays?: number
    /** Obligatorio si va `harmfulActDate`. Entero mayor o igual a 1. */
    harmfulActTermDays?: number
    /** Obligatorio si va `harmfulActDate`: `BUSINESS` o `CONSECUTIVE`. */
    harmfulActTermDayType?: Exclude<DayType, 'NONE'>
    /** Solo en `ADMINISTRATIVE`. No posterior a hoy. */
    administrativeRemedyExhaustedOn?: string
    /** En los tres fueros. Por defecto, `false`. */
    courtFeePaid?: boolean
}

/** Una calificación elegida en el formulario, con la fecha del hecho que se va cargando. */
export interface CaseQualificationValue {
    legalQualificationId: number
    /** `YYYY-MM-DD`, o `''` mientras no se cargó. */
    offenseDate: string
}

/**
 * Los valores del formulario de alta. No pasa por `FormModal` —es un
 * formulario de página—, así que las calificaciones pueden ser un arreglo; el
 * resto sigue siendo texto, como devuelven los inputs.
 */
export type CaseFormValues = {
    sacNumber: string
    jurisdiction: Jurisdiction
    caption: string
    court: string
    instructorName: string
    tribunalPhone: string
    instructorExtension: string
    /** Id como texto: sale de un select. `''` = sin elegir. */
    clientId: string
    proceduralRole: ProceduralRole
    /** En el orden en que se agregaron. Sólo en el fuero penal. */
    legalQualifications: CaseQualificationValue[]
    counterparty: string
    /** Objeto del reclamo o del amparo. Sólo fuera del fuero penal. */
    subjectMatter: string
    /** Id como texto: sale de un select. `''` = sin elegir. */
    responsibleLawyerId: string
    startDate: string
    /* Datos propios de cada fuero (V4 D-67): se cargan solo en el alta. */
    /** "Preso". Solo en el penal. */
    clientDetained: boolean
    /** "El juez hizo lugar a la medida cautelar". Solo en el amparo. */
    injunctionGranted: boolean
    /** `YYYY-MM-DD` o `''`. Solo en el amparo. */
    harmfulActDate: string
    harmfulActRenews: boolean
    /** Entero como texto: sale de un input. */
    harmfulActRenewalDays: string
    /** Entero como texto. */
    harmfulActTermDays: string
    harmfulActTermDayType: Exclude<DayType, 'NONE'>
    /** `YYYY-MM-DD` o `''`. Solo en el administrativo. */
    administrativeRemedyExhaustedOn: string
    /** "Tasa de justicia pagada". En los tres fueros. */
    courtFeePaid: boolean
}

/** Parámetros del listado `GET /cases`. Van también en la clave de caché. */
export interface CaseListParams extends PaginatedQuery {
    /** Filtra por SAC, carátula y apellido y nombres del cliente. */
    search?: string
    jurisdiction?: Jurisdiction
    responsibleLawyerId?: number
    /** Excluyente con `customState` y `withoutProceduralActs`. */
    proceduralStateId?: number
    /** Excluyente con `proceduralStateId` y `withoutProceduralActs`. */
    customState?: string
    /**
     * `true`: sólo las causas en el estado inicial, "Iniciada" (D-29 y D-34).
     * Excluyente con `proceduralStateId` y `customState`.
     */
    withoutProceduralActs?: boolean
    clientId?: number
    /**
     * `true`: sólo causas con vencimiento abierto, vencidas incluidas: el del
     * acto procesal o, en un amparo en "Iniciada", el del acto lesivo (V4 D-82).
     */
    openDeadline?: boolean
}
