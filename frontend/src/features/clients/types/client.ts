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

/** El recurso tal como viene adentro de `data`. */
export interface Client {
    id: number
    lastName: string
    firstName: string
    /** Sólo dígitos, sin puntos: `34812905`. Los puntos son de presentación. */
    dni: string
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
 * Cuerpo del `POST /clients`. Teléfono y correo son opcionales: si están
 * vacíos no viajan.
 */
export interface CreateClientBody {
    lastName: string
    firstName: string
    dni: string
    phone?: string
    email?: string
}

/** Los valores del formulario. Sólo `string`, como pide `FormValues`. */
export type ClientFormValues = {
    lastName: string
    firstName: string
    /** Como lo escriba el usuario: con o sin puntos. Se limpia al armar el cuerpo. */
    dni: string
    phone: string
    email: string
}

/** Parámetros del listado `GET /clients`. */
export interface ClientListParams extends PaginatedQuery {
    /** Filtra por apellido, por nombres y por DNI. */
    search?: string
}
