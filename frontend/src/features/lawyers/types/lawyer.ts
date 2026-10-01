/**
 * Abogado: la ficha profesional del staff.
 *
 * Escrito a partir del contrato (§3.3), no copiado de `shared/mocks`.
 *
 * Un abogado no es un usuario: la ficha es de quien ejerce, el usuario es de
 * quien entra al sistema. Se vinculan, pero se dan de alta por separado.
 */

import type { PaginatedQuery } from '@/api-contract/envelopes'

/** El recurso tal como viene adentro de `data`. */
export interface Lawyer {
    id: number
    fullName: string
    /**
     * Matrícula del Colegio de Abogados de Córdoba: circunscripción y número
     * separados por guión, `1-28114`.
     */
    registrationNumber: string
    /**
     * Causas activas de las que es responsable: las que no fueron dadas de
     * baja y no están en un estado terminal (V3 §4). Calculado, sólo lectura.
     */
    activeCases: number
    /** Estado de alta. La baja es lógica. */
    active: boolean
}

/** Cuerpo del `POST /lawyers`: sólo los dos campos que el estudio carga. */
export interface CreateLawyerBody {
    fullName: string
    registrationNumber: string
}

/**
 * Cuerpo del `PATCH /lawyers/{id}`: todo opcional, al menos un campo.
 * `activeCases` no está porque no es modificable: lo calcula el backend.
 */
export interface UpdateLawyerBody {
    fullName?: string
    registrationNumber?: string
}

/** Los valores del formulario. Sólo `string`, como pide `FormValues`. */
export type LawyerFormValues = {
    fullName: string
    registrationNumber: string
}

/** Parámetros del listado `GET /lawyers`. */
export interface LawyerListParams extends PaginatedQuery {
    /** Filtra por `fullName` y por `registrationNumber`. */
    search?: string
}
