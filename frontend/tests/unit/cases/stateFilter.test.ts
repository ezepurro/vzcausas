import { describe, expect, it } from 'vitest'
import {
    ALL_STATES,
    customStateFilterValue,
    stateFilterParams,
    stateFilterValue,
    WITHOUT_ACTS,
} from '@/features/cases/utils/stateFilter'

describe('filtro de estado del listado', () => {
    it('cada clase de opción viaja en su parámetro, y nunca más de uno', () => {
        expect(stateFilterParams(stateFilterValue(4))).toEqual({ proceduralStateId: 4 })
        expect(stateFilterParams(customStateFilterValue('En espera de pericia'))).toEqual({ customState: 'En espera de pericia' })
        expect(stateFilterParams(WITHOUT_ACTS)).toEqual({ withoutProceduralActs: true })
    })

    it('sin filtro o con un valor que no reconoce, no manda nada', () => {
        expect(stateFilterParams(ALL_STATES)).toEqual({})
        expect(stateFilterParams('state:abc')).toEqual({})
        expect(stateFilterParams('otra-cosa')).toEqual({})
    })
})

/**
 * HU-20, CA-20.4: el filtro de estado aplica una sola de sus tres clases —un
 * estado de la tabla del fuero, el estado inicial "Iniciada" o un estado
 * escrito a mano—, que son excluyentes entre sí.
 */
describe('filtro de estado del listado · una sola clase por vez (CA-20.4)', () => {
    /* CA-20.4 */
    it.each([
        ['un estado de la tabla', stateFilterValue(12), 'proceduralStateId'],
        ['"Iniciada"', WITHOUT_ACTS, 'withoutProceduralActs'],
        ['un estado escrito a mano', customStateFilterValue('Con acusación, pero con oposición'), 'customState'],
    ])('%s manda un solo parámetro, el de su clase', (_, value, param) => {
        expect(Object.keys(stateFilterParams(value))).toEqual([param])
    })

    /* CA-20.4: el backend compara el texto, así que tiene que llegar entero. */
    it('un estado escrito a mano viaja con su texto tal cual', () => {
        for (const name of ['Con acusación, pero con oposición', 'A la espera: pericia N° 2', 'ARCHIVO provisorio']) {
            expect(stateFilterParams(customStateFilterValue(name))).toEqual({ customState: name })
        }
    })

    /* CA-20.4: lo escribe una persona, así que puede parecerse a un valor del filtro. */
    it('un estado escrito a mano que se llama como un valor del filtro no se confunde con otra clase', () => {
        expect(stateFilterParams(customStateFilterValue(WITHOUT_ACTS))).toEqual({ customState: WITHOUT_ACTS })
        expect(stateFilterParams(customStateFilterValue(stateFilterValue(4)))).toEqual({
            customState: stateFilterValue(4),
        })
    })

    /* CA-20.4: un valor roto no filtra por nada, en vez de mandar un parámetro inválido. */
    it.each(['state:0', 'state:-1', 'state:1.5', 'state:', 'custom:'])('"%s" no manda nada', (value) => {
        expect(stateFilterParams(value)).toEqual({})
    })
})
