import { describe, expect, it } from 'vitest'
import {
    buildPositionOptions,
    currentPositionChoice,
    resolvePosition,
    siblingsOf,
} from '@/features/legal-params/utils/positionOptions'
import type { ProceduralState } from '@/features/legal-params/types/proceduralState'

function state(id: number, name: string, position: number, active = true): ProceduralState {
    return {
        id,
        name,
        jurisdiction: 'CRIMINAL',
        position,
        timeLimitDays: 3,
        dayType: 'BUSINESS',
        terminal: false,
        activeCases: 0,
        active,
    }
}

const A = state(10, 'Designación', 1)
const B = state(20, 'Cédula', 2)
const C = state(30, 'Citación', 3)

describe('siblingsOf', () => {
    it('ordena por posición', () => {
        expect(siblingsOf([C, A, B]).map((s) => s.id)).toEqual([10, 20, 30])
    })

    it('saca el estado que se está editando', () => {
        expect(siblingsOf([A, B, C], 20).map((s) => s.id)).toEqual([10, 30])
    })

    it('saca los inactivos', () => {
        const inactive = state(40, 'Dado de baja', 4, false)
        expect(siblingsOf([A, inactive]).map((s) => s.id)).toEqual([10])
    })

    it('no modifica el arreglo original', () => {
        const cycle = [C, A, B]
        siblingsOf(cycle)
        expect(cycle.map((s) => s.id)).toEqual([30, 10, 20])
    })
})

describe('buildPositionOptions', () => {
    it('ofrece al inicio, un "después de" por hermano y al final', () => {
        expect(buildPositionOptions([A, B])).toEqual([
            { value: 'FIRST', label: 'Al inicio del ciclo' },
            { value: 'AFTER:10', label: 'Después de «Designación»' },
            { value: 'AFTER:20', label: 'Después de «Cédula»' },
            { value: 'LAST', label: 'Al final del ciclo' },
        ])
    })

    it('sin hermanos, sólo al inicio y al final', () => {
        expect(buildPositionOptions([]).map((o) => (typeof o === 'string' ? o : o.value))).toEqual([
            'FIRST',
            'LAST',
        ])
    })
})

describe('resolvePosition', () => {
    const siblings = [A, B, C]

    it('al inicio es la posición 1', () => {
        expect(resolvePosition('FIRST', siblings)).toBe(1)
    })

    it('al final es undefined: el backend lo manda al final solo', () => {
        expect(resolvePosition('LAST', siblings)).toBeUndefined()
    })

    it('después del primero es la posición 2', () => {
        expect(resolvePosition('AFTER:10', siblings)).toBe(2)
    })

    it('después del último es la posición siguiente', () => {
        expect(resolvePosition('AFTER:30', siblings)).toBe(4)
    })

    it('si el hermano ya no está, cae en al final', () => {
        expect(resolvePosition('AFTER:99', siblings)).toBeUndefined()
    })
})

describe('currentPositionChoice', () => {
    it('nombra el lugar por el hermano anterior', () => {
        expect(currentPositionChoice(C, [A, B])).toBe('AFTER:20')
    })

    it('el primero del ciclo queda al inicio', () => {
        expect(currentPositionChoice(A, [B, C])).toBe('FIRST')
    })
})
