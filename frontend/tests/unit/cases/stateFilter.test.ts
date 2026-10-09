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
