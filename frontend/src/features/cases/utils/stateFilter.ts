/**
 * El filtro "Todos los estados procesales" del listado mezcla dos cosas en un
 * mismo select: los estados de la tabla de cada fuero (por id) y los escritos
 * a mano en causas (por texto). El contrato los manda en parámetros distintos
 * y excluyentes (`proceduralStateId` o `customState`), así que el valor del
 * select lleva un prefijo que dice de cuál de los dos se trata.
 */

import type { CaseListParams } from '@/features/cases/types/case'

const STATE_PREFIX = 'state:'
const CUSTOM_PREFIX = 'custom:'

/** Sin filtro de estado. */
export const ALL_STATES = ''

export function stateFilterValue(proceduralStateId: number): string {
    return `${STATE_PREFIX}${proceduralStateId}`
}

export function customStateFilterValue(name: string): string {
    return `${CUSTOM_PREFIX}${name}`
}

/** El valor del select → los parámetros del listado. Nunca los dos a la vez. */
export function stateFilterParams(
    value: string,
): Pick<CaseListParams, 'proceduralStateId' | 'customState'> {
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
