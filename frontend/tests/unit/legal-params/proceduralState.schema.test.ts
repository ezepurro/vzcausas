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
    describe('nombre', () => {
        it('rechaza menos de 3 caracteres', () => {
            expect(validateProceduralState({ ...VALID, name: 'ab' }).name).toBe(
                'Debe tener entre 3 y 80 caracteres.',
            )
        })
    })

    describe('plazo', () => {
        it.each(['-1', '10000'])('rechaza %s', (timeLimitDays) => {
            expect(validateProceduralState({ ...VALID, timeLimitDays }).timeLimitDays).toBe(
                'Debe ser un número entero de 0 a 9999.',
            )
        })
    })

    describe('tipo de día', () => {
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
    })
})
