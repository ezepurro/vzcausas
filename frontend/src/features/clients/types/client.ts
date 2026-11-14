/**
 * Cliente: la persona que firma el convenio con el estudio.
 *
 * Escrito a partir del contrato (V6 §3.6), no copiado de `shared/mocks`.
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
    /** Dirección. Texto libre. Obligatoria desde D-109: nunca llega `null`. */
    address: string
    /** Teléfono. Texto libre. Obligatorio desde D-109: nunca llega `null`. */
    phone: string
    email: string | null
    /** Fecha de alta en el estudio, `YYYY-MM-DD`. La asigna el backend y no se modifica. */
    clientSince: string
    /** Causas activas en las que es cliente. Calculado, sólo lectura. */
    activeCases: number
    /**
     * Vale siempre `true`: un cliente dado de baja (HU11) no se lista y su
     * consulta responde `404`, así que nunca llega uno con `false`.
     */
    active: boolean
}

/**
 * Cuerpo del `POST /clients`. Dirección y teléfono son obligatorios (D-109);
 * el correo es opcional: si está vacío no viaja.
 */
export interface CreateClientBody {
    lastName: string
    firstName: string
    documentType: DocumentType
    documentNumber: string
    address: string
    phone: string
    email?: string
}

/**
 * Cuerpo del `PATCH /clients/{clientId}` (HU10). Todo es opcional, pero tiene
 * que viajar al menos un campo: un cuerpo vacío es un `400` (CA-10.1). Un
 * campo que no viaja no cambia.
 *
 * - El documento se puede cambiar (D-121): el número se valida contra el tipo
 *   que resulta del cambio.
 * - `email` en `null` lo borra. Los demás no se pueden vaciar (D-109).
 * - No está `clientSince`: mandarlo es un `400` (CA-10.8).
 */
export interface UpdateClientBody {
    lastName?: string
    firstName?: string
    documentType?: DocumentType
    documentNumber?: string
    address?: string
    phone?: string
    email?: string | null
}

/** Los valores del formulario. Sólo `string`, como pide `FormValues`. */
export type ClientFormValues = {
    lastName: string
    firstName: string
    /** Uno de `DOCUMENT_TYPES`: sale de un select. */
    documentType: string
    /** Como lo escriba el usuario: el DNI, sin puntos (tope de 8). Se limpia al armar el cuerpo. */
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