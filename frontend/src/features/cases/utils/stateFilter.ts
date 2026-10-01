/**
 * El filtro "Todos los estados procesales" del listado mezcla tres cosas en un
 * mismo select: los estados de la tabla de cada fuero (por id), el "Sin acto
 * procesal" de las causas nuevas, y los escritos a mano en causas (por texto).
 *
 * El contrato manda cada una en un parámetro distinto, y los tres son
 * excluyentes entre sí (`proceduralStateId`, `withoutProceduralActs` o
 * `customState`, V3 D-29), así que el valor del select lleva un prefijo que
 * dice de cuál se trata.
 */

import type { CaseListParams } from '@/features/cases/types/case'

const STATE_PREFIX = 'state:'
const CUSTOM_PREFIX = 'custom:'

/** Sin filtro de estado. */
export const ALL_STATES = ''

/**
 * "Sin acto procesal": las causas que todavía no tienen estado. Es un valor
 * fijo del grupo "Causas nuevas": no depende del fuero ni viene de la API.
 */
export const WITHOUT_ACTS = 'without-acts'

export function stateFilterValue(proceduralStateId: number): string {
    return `${STATE_PREFIX}${proceduralStateId}`
}

export function customStateFilterValue(name: string): string {
    return `${CUSTOM_PREFIX}${name}`
}

/** El valor del select → los parámetros del listado. Nunca más de uno a la vez. */
export function stateFilterParams(
    value: string,
): Pick<CaseListParams, 'proceduralStateId' | 'customState' | 'withoutProceduralActs'> {
    if (value === WITHOUT_ACTS) return { withoutProceduralActs: true }
    if (value.startsWith(STATE_PREFIX)) {
        const id = Number(value.slice(STATE_PREFIX.length))
        return Number.isInteger(id) && id > 0 ? { proceduralStateId: id } : {}
    }
    if (value.startsWith(CUSTOM_PREFIX)) {
        const name = value.slice(CUSTOM_PREFIX.length)
        return name ? { customState: name } : {}
    }
    return {}
}
