/**
 * Cliente: la persona que firma el convenio con el estudio.
 *
 * Escrito a partir del contrato (V3 §3.6), no copiado de `shared/mocks`.
 *
 * Es la primera persona del sistema con apellido y nombres en campos
 * separados (observación de la Sprint Review 1): el backend los guarda tal
 * como llegan y la forma `GÓMEZ, Ariel Fernando` la arma el front.
 */

import type { PaginatedQuery } from '@/api-contract/envelopes'

/** Los tipos de documento que acepta el estudio. */
export const DOCUMENT_TYPES = ['DNI', 'PASSPORT'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

/** El recurso tal como viene adentro de `data`. */
export interface Client {
    id: number
    lastName: string
    firstName: string
    documentType: DocumentType
    /**
     * Con DNI, sólo dígitos y sin puntos: `34812905`; los puntos son de
     * presentación. Con pasaporte, letras y números en mayúsculas: `AAA123456`.
     */
    documentNumber: string
    /** Dirección. Texto libre. */
    address: string | null
    phone: string | null
    email: string | null
    /** Fecha de alta en el estudio, `YYYY-MM-DD`. La asigna el backend. */
    clientSince: string
    /** Causas activas en las que es cliente. Calculado, sólo lectura. */
    activeCases: number
    /** Vale siempre `true`: la baja (HU11) es del Sprint 4. */
    active: boolean
}

/**
 * Cuerpo del `POST /clients`. Dirección, teléfono y correo son opcionales:
 * si están vacíos no viajan.
 */
export interface CreateClientBody {
    lastName: string
    firstName: string
    documentType: DocumentType
    documentNumber: string
    address?: string
    phone?: string
    email?: string
}

/** Los valores del formulario. Sólo `string`, como pide `FormValues`. */
export type ClientFormValues = {
    lastName: string
    firstName: string
    /** Uno de `DOCUMENT_TYPES`: sale de un select. */
    documentType: string
    /** Como lo escriba el usuario: con o sin puntos. Se limpia al armar el cuerpo. */
    documentNumber: string
    address: string
    phone: string
    email: string
}

/** Parámetros del listado `GET /clients`. */
export interface ClientListParams extends PaginatedQuery {
    /** Filtra por apellido, por nombres y por número de documento. */
    search?: string
}
