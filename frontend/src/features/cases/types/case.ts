/**
 * Causa: las formas sacadas del contrato (V3 §3.7).
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

/** Una calificación de la causa, con su prescripción ya calculada por el backend. */
export interface CaseLegalQualification {
    id: number
    name: string
    prescriptionMonths: number
    /** `prescriptionStartsOn` más `prescriptionMonths`, `YYYY-MM-DD`. */
    prescriptionExpiresOn: string
}

/** El estado procesal actual. */
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
    client: CaseClient
    responsibleLawyer: CaseLawyer
    /** Al menos una en el penal; vacío en los demás fueros. */
    legalQualifications: CaseLegalQualification[]
    /** `YYYY-MM-DD` */
    startDate: string
    /** Desde cuándo corre la prescripción. `null` fuera del penal. */
    prescriptionStartsOn: string | null
    currentState: CaseState
    /** `null` si la causa no tiene plazo abierto: es una causa "para impulsar". */
    nextDeadline: NextDeadline | null
    active: boolean
}

/**
 * Cuerpo del `POST /cases`. `legalQualificationIds` va sólo en el penal y
 * `counterparty` sólo en los otros dos fueros: mandar cualquiera de los dos
 * donde no corresponde es un `400`.
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
    legalQualificationIds?: number[]
    counterparty?: string
    responsibleLawyerId: number
    /** Por defecto, hoy. No puede ser posterior a hoy. */
    startDate?: string
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
    legalQualificationIds: number[]
    counterparty: string
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
    /** Excluyente con `customState`. */
    proceduralStateId?: number
    /** Excluyente con `proceduralStateId`. */
    customState?: string
    clientId?: number
    /** `true`: sólo causas con plazo abierto, vencidas incluidas. */
    openDeadline?: boolean
}
