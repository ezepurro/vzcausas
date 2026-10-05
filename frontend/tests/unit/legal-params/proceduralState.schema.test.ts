import { describe, expect, it } from 'vitest'
import { validateProceduralState } from '@/features/legal-params/schemas/proceduralState.schema'
import type { ProceduralStateFormValues } from '@/features/legal-params/types/proceduralState'

const VALID: ProceduralStateFormValues = {
    name: 'Oposición',
    timeLimitDays: '5',
    dayType: 'BUSINESS',
    terminal: false,
}

describe('validateProceduralState', () => {
    it('no devuelve errores con valores válidos', () => {
        expect(validateProceduralState(VALID)).toEqual({})
    })

    describe('nombre', () => {
        it('es obligatorio', () => {
            expect(validateProceduralState({ ...VALID, name: '  ' }).name).toBe(
                'El nombre del estado es obligatorio.',
            )
        })

        it('rechaza menos de 3 caracteres', () => {
            expect(validateProceduralState({ ...VALID, name: 'ab' }).name).toBe(
                'Debe tener entre 3 y 80 caracteres.',
            )
        })

        it('rechaza más de 80 caracteres', () => {
            expect(validateProceduralState({ ...VALID, name: 'a'.repeat(81) }).name).toBe(
                'Debe tener entre 3 y 80 caracteres.',
            )
        })

        it('acepta exactamente 3 y exactamente 80', () => {
            expect(validateProceduralState({ ...VALID, name: 'abc' }).name).toBeUndefined()
            expect(
                validateProceduralState({ ...VALID, name: 'a'.repeat(80) }).name,
            ).toBeUndefined()
        })
    })

    describe('plazo', () => {
        it('es obligatorio', () => {
            expect(validateProceduralState({ ...VALID, timeLimitDays: '' }).timeLimitDays).toBe(
                'El plazo es obligatorio. Poné 0 si el estado no abre plazo.',
            )
        })

        it.each(['-1', '2.5', 'cinco', '10000'])('rechaza %s', (timeLimitDays) => {
            expect(validateProceduralState({ ...VALID, timeLimitDays }).timeLimitDays).toBe(
                'Debe ser un número entero de 0 a 9999.',
            )
        })

        it('acepta 9999', () => {
            expect(validateProceduralState({ ...VALID, timeLimitDays: '9999' })).toEqual({})
        })
    })

    describe('tipo de día', () => {
        it('plazo 0 con NONE es válido', () => {
            expect(
                validateProceduralState({ ...VALID, timeLimitDays: '0', dayType: 'NONE' }),
            ).toEqual({})
        })

        it('plazo 0 con días hábiles es un error', () => {
            expect(
                validateProceduralState({ ...VALID, timeLimitDays: '0', dayType: 'BUSINESS' })
                    .dayType,
            ).toBe('Un estado con plazo 0 no abre plazo: no se cuentan días.')
        })

        it('un plazo mayor a 0 con NONE es un error', () => {
            expect(validateProceduralState({ ...VALID, dayType: 'NONE' }).dayType).toBe(
                'Indicá si los días son hábiles o corridos.',
            )
        })

        it('rechaza un tipo de día que no existe', () => {
            expect(validateProceduralState({ ...VALID, dayType: 'FERIADOS' }).dayType).toBe(
                'Elegí cómo se cuentan los días.',
            )
        })

        it('si el plazo ya está mal, no suma un error de tipo de día', () => {
            const errors = validateProceduralState(
                { ...VALID, timeLimitDays: 'abc', dayType: 'NONE' })
            expect(errors.timeLimitDays).toBeDefined()
            expect(errors.dayType).toBeUndefined()
        })
    })
})
