/**
 * Causa: las formas sacadas del contrato (V3 §3.7, con la revisión del
 * 01/10/2026).
 *
 * Escrito a partir del contrato, no copiado de `shared/mocks`.
 */

import type { PaginatedQuery } from '@/api-contract/envelopes'
import type { Client } from '@/features/clients'
import type { Jurisdiction } from '@/features/legal-params'

/**
 * Posición del cliente en la causa (V3 §2). No confundir con `Role`, que es el
 * perfil de seguridad del usuario.
 */
export const PROCEDURAL_ROLES = [
    'DEFENSE',
    'PRIVATE_PROSECUTOR',
    'APPELLANT',
    'PLAINTIFF',
    'DEFENDANT',
] as const
export type ProceduralRole = (typeof PROCEDURAL_ROLES)[number]

export const PROCEDURAL_ROLE_LABELS: Record<ProceduralRole, string> = {
    DEFENSE: 'Defensa',
    PRIVATE_PROSECUTOR: 'Querellante particular',
    APPELLANT: 'Recurrente',
    PLAINTIFF: 'Actora',
    DEFENDANT: 'Demandada',
}

/**
 * Qué roles admite cada fuero, en el orden del prototipo. El primero es el
 * que queda elegido al cambiar de fuero. El backend rechaza con `400` un rol
 * que no corresponda.
 */
export const PROCEDURAL_ROLES_BY_JURISDICTION: Record<Jurisdiction, readonly ProceduralRole[]> = {
    CRIMINAL: ['DEFENSE', 'PRIVATE_PROSECUTOR'],
    ADMINISTRATIVE: ['DEFENSE', 'APPELLANT'],
    AMPARO: ['PLAINTIFF', 'DEFENDANT'],
}

/** El cliente tal como viene embebido en la causa: sin `activeCases` ni `active`. */
export type CaseClient = Pick<
    Client,
    'id' | 'lastName' | 'firstName' | 'dni' | 'phone' | 'email' | 'clientSince'
>

/** El abogado responsable embebido (RN3). */
export interface CaseLawyer {
    id: number
    fullName: string
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
     * Desde cuándo se computa la prescripción, `YYYY-MM-DD`. Hoy es igual a
     * `offenseDate`; con los actos interruptivos (HU31) será la fecha del último.
     */
    prescriptionStartsOn: string
    /** `prescriptionStartsOn` más `prescriptionMonths`, `YYYY-MM-DD`. */
    prescriptionExpiresOn: string
}

/** El estado procesal de una causa, o el resultante de un acto. */
export interface CaseState {
    /** `null` si el estado fue escrito a mano en un acto. */
    proceduralStateId: number | null
    name: string
    /** `true` si es un estado escrito a mano para esta causa. */
    custom: boolean
}

/** El plazo abierto de la causa. */
export interface NextDeadline {
    proceduralActId: number
    /** `YYYY-MM-DD` */
    dueDate: string
    /** Días hábiles hasta `dueDate`: `0` vence hoy, negativo ya vencido. */
    businessDaysRemaining: number
    manuallyAdjusted: boolean
}

/** El recurso tal como viene adentro de `data`. El listado y el detalle devuelven lo mismo. */
export interface Case {
    id: number
    /** 8 dígitos. Identifica la causa (RN2). No modificable. */
    sacNumber: string
    /** Carátula. */
    caption: string
    court: string | null
    jurisdiction: Jurisdiction
    proceduralRole: ProceduralRole
    instructorName: string | null
    instructorPhone: string | null
    /** Contraparte u organismo. `null` en el fuero penal. */
    counterparty: string | null
    /** Objeto del reclamo o del amparo (D-27). `null` en el fuero penal. */
    subjectMatter: string | null
    client: CaseClient
    responsibleLawyer: CaseLawyer
    /** Al menos una en el penal; vacío en los demás fueros. */
    legalQualifications: CaseLegalQualification[]
    /** `YYYY-MM-DD`. No interviene en la prescripción: esa corre desde la fecha del hecho. */
    startDate: string
    /**
     * `null` mientras la causa no tenga actos procesales: nace sin estado y lo
     * fija su primer acto (D-09). Se muestra como "Sin acto procesal"; ver
     * `utils/caseState`.
     */
    currentState: CaseState | null
    /** `null` si la causa no tiene plazo abierto: es una causa "para impulsar". */
    nextDeadline: NextDeadline | null
    active: boolean
}

/** Una calificación en el cuerpo del alta: cuál es y cuándo fue el hecho. */
export interface CaseQualificationBody {
    legalQualificationId: number
    /** `YYYY-MM-DD`. Obligatoria (D-28) y no posterior a hoy. */
    offenseDate: string
}

/**
 * Cuerpo del `POST /cases`. `legalQualifications` va sólo en el penal;
 * `counterparty` y `subjectMatter`, sólo en los otros dos fueros. Mandar
 * cualquiera donde no corresponde es un `400`.
 */
export interface CreateCaseBody {
    sacNumber: string
    jurisdiction: Jurisdiction
    caption: string
    court?: string
    instructorName?: string
    instructorPhone?: string
    clientId: number
    proceduralRole: ProceduralRole
    legalQualifications?: CaseQualificationBody[]
    counterparty?: string
    /** Obligatorio fuera del penal, hasta 800 caracteres. */
    subjectMatter?: string
    responsibleLawyerId: number
    /** Por defecto, hoy. No puede ser posterior a hoy. */
    startDate?: string
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
    instructorPhone: string
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
     * `true`: sólo las causas "Sin acto procesal" (D-29). Excluyente con
     * `proceduralStateId` y `customState`.
     */
    withoutProceduralActs?: boolean
    clientId?: number
    /** `true`: sólo causas con plazo abierto, vencidas incluidas. */
    openDeadline?: boolean
}
