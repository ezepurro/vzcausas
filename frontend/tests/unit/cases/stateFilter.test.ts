import { describe, expect, it } from 'vitest'
import {
    customStateFilterValue,
    stateFilterParams,
    stateFilterValue,
    WITHOUT_ACTS } from '@/features/cases/utils/stateFilter'

describe('filtro de estado del listado', () => {
    it('cada clase de opción viaja en su parámetro, y nunca más de uno', () => {
        expect(stateFilterParams(stateFilterValue(4))).toEqual({ proceduralStateId: 4 })
        expect(stateFilterParams(customStateFilterValue('En espera de pericia'))).toEqual({ customState: 'En espera de pericia' })
        expect(stateFilterParams(WITHOUT_ACTS)).toEqual({ withoutProceduralActs: true })
    })
})

/**
 * HU-20, CA-20.4: el filtro de estado aplica una sola de sus tres clases —un
 * estado de la tabla del fuero, el estado inicial "Iniciada" o un estado
 * escrito a mano—, que son excluyentes entre sí.
 */
describe('filtro de estado del listado · una sola clase por vez (CA-20.4)', () => {
    /* CA-20.4: lo escribe una persona, así que puede parecerse a un valor del filtro. */
    it('un estado escrito a mano que se llama como un valor del filtro no se confunde con otra clase', () => {
        expect(stateFilterParams(customStateFilterValue(WITHOUT_ACTS))).toEqual({ customState: WITHOUT_ACTS })
        expect(stateFilterParams(customStateFilterValue(stateFilterValue(4)))).toEqual({
            customState: stateFilterValue(4),
        })
    })
})
