import { describe, expect, it } from 'vitest'
import {
    ALL_STATES,
    customStateFilterValue,
    stateFilterParams,
    stateFilterValue,
    WITHOUT_ACTS,
} from '@/features/cases/utils/stateFilter'
import { caseStateLabel, NO_PROCEDURAL_ACT_LABEL } from '@/features/cases/utils/caseState'

describe('estado procesal de una causa', () => {
    it('una causa sin actos se muestra como "Sin acto procesal"', () => {
        expect(caseStateLabel(null)).toBe('Sin acto procesal')
        expect(NO_PROCEDURAL_ACT_LABEL).toBe('Sin acto procesal')
    })

    it('si tiene estado, muestra su nombre, sea de la tabla o escrito a mano', () => {
        expect(caseStateLabel({ proceduralStateId: 4, name: 'Alegato', custom: false })).toBe('Alegato')
        expect(caseStateLabel({ proceduralStateId: null, name: 'En espera de pericia', custom: true })).toBe('En espera de pericia')
    })
})

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
