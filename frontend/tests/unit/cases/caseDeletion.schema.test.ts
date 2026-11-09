import { describe, expect, it } from 'vitest'
import { validateDeleteCase } from '@/features/cases/schemas/caseDeletion.schema'

/**
 * CA-21.2: el motivo de la baja es opcional y tiene hasta 500 caracteres
 * (V5 §3.7). El servidor lo vuelve a controlar; esto es para marcarlo en el
 * campo sin gastar un viaje.
 */
describe('validateDeleteCase', () => {
    it('sin motivo no hay error', () => {
        expect(validateDeleteCase({ reason: '' })).toEqual({})
        expect(validateDeleteCase({ reason: '   ' })).toEqual({})
    })

    it('500 caracteres se aceptan, y los espacios de los bordes no cuentan', () => {
        expect(validateDeleteCase({ reason: `  ${'a'.repeat(500)}  ` })).toEqual({})
    })

    it('con más de 500 caracteres marca el motivo', () => {
        expect(validateDeleteCase({ reason: 'a'.repeat(501) })).toEqual({
            reason: 'Puede tener hasta 500 caracteres.',
        })
    })
})
