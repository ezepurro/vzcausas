import { describe, expect, it } from 'vitest'
import { validateProceduralState } from '@/features/legal-params/schemas/proceduralState.schema'
import type {
    ProceduralState,
    ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState'

function state(id: number, name: string, position: number): ProceduralState {
    return {
        id,
        name,
        jurisdiction: 'CRIMINAL',
        position,
        timeLimitDays: 3,
        dayType: 'BUSINESS',
        terminal: false,
        activeCases: 0,
        active: true,
    }
}

const SIBLINGS = [state(1, 'Designación', 1), state(2, 'Cédula', 2)]

const VALID: ProceduralStateFormValues = {
    name: 'Oposición',
    positionChoice: 'LAST',
    timeLimitDays: '5',
    dayType: 'BUSINESS',
    terminal: false,
}

describe('validateProceduralState', () => {
    it('no devuelve errores con valores válidos', () => {
        expect(validateProceduralState(VALID, SIBLINGS)).toEqual({})
    })

    describe('nombre', () => {
        it('es obligatorio', () => {
            expect(validateProceduralState({ ...VALID, name: '  ' }, SIBLINGS).name).toBe(
                'El nombre del estado es obligatorio.',
            )
        })

        it('rechaza menos de 3 caracteres', () => {
            expect(validateProceduralState({ ...VALID, name: 'ab' }, SIBLINGS).name).toBe(
                'Debe tener entre 3 y 80 caracteres.',
            )
        })

        it('rechaza más de 80 caracteres', () => {
            expect(validateProceduralState({ ...VALID, name: 'a'.repeat(81) }, SIBLINGS).name).toBe(
                'Debe tener entre 3 y 80 caracteres.',
            )
        })

        it('acepta exactamente 3 y exactamente 80', () => {
            expect(validateProceduralState({ ...VALID, name: 'abc' }, SIBLINGS).name).toBeUndefined()
            expect(
                validateProceduralState({ ...VALID, name: 'a'.repeat(80) }, SIBLINGS).name,
            ).toBeUndefined()
        })
    })

    describe('posición', () => {
        it('acepta al inicio y al final', () => {
            expect(validateProceduralState({ ...VALID, positionChoice: 'FIRST' }, SIBLINGS)).toEqual({})
            expect(validateProceduralState({ ...VALID, positionChoice: 'LAST' }, SIBLINGS)).toEqual({})
        })

        it('acepta "después de" un estado que sigue en el ciclo', () => {
            expect(validateProceduralState({ ...VALID, positionChoice: 'AFTER:2' }, SIBLINGS)).toEqual({})
        })

        it('rechaza "después de" un estado que ya no está', () => {
            expect(
                validateProceduralState({ ...VALID, positionChoice: 'AFTER:99' }, SIBLINGS).positionChoice,
            ).toBe('Elegí en qué lugar del ciclo va el estado.')
        })

        it('rechaza un valor que no es ninguna de las opciones', () => {
            expect(
                validateProceduralState({ ...VALID, positionChoice: '' }, SIBLINGS).positionChoice,
            ).toBe('Elegí en qué lugar del ciclo va el estado.')
        })
    })

    describe('plazo', () => {
        it('es obligatorio', () => {
            expect(validateProceduralState({ ...VALID, timeLimitDays: '' }, SIBLINGS).timeLimitDays).toBe(
                'El plazo es obligatorio. Poné 0 si el estado no abre plazo.',
            )
        })

        it.each(['-1', '2.5', 'cinco', '10000'])('rechaza %s', (timeLimitDays) => {
            expect(validateProceduralState({ ...VALID, timeLimitDays }, SIBLINGS).timeLimitDays).toBe(
                'Debe ser un número entero de 0 a 9999.',
            )
        })

        it('acepta 9999', () => {
            expect(validateProceduralState({ ...VALID, timeLimitDays: '9999' }, SIBLINGS)).toEqual({})
        })
    })

    describe('tipo de día', () => {
        it('plazo 0 con NONE es válido', () => {
            expect(
                validateProceduralState({ ...VALID, timeLimitDays: '0', dayType: 'NONE' }, SIBLINGS),
            ).toEqual({})
        })

        it('plazo 0 con días hábiles es un error', () => {
            expect(
                validateProceduralState({ ...VALID, timeLimitDays: '0', dayType: 'BUSINESS' }, SIBLINGS)
                    .dayType,
            ).toBe('Un estado con plazo 0 no abre plazo: no se cuentan días.')
        })

        it('un plazo mayor a 0 con NONE es un error', () => {
            expect(validateProceduralState({ ...VALID, dayType: 'NONE' }, SIBLINGS).dayType).toBe(
                'Indicá si los días son hábiles o corridos.',
            )
        })

        it('rechaza un tipo de día que no existe', () => {
            expect(validateProceduralState({ ...VALID, dayType: 'FERIADOS' }, SIBLINGS).dayType).toBe(
                'Elegí cómo se cuentan los días.',
            )
        })

        it('si el plazo ya está mal, no suma un error de tipo de día', () => {
            const errors = validateProceduralState(
                { ...VALID, timeLimitDays: 'abc', dayType: 'NONE' },
                SIBLINGS,
            )
            expect(errors.timeLimitDays).toBeDefined()
            expect(errors.dayType).toBeUndefined()
        })
    })
})
