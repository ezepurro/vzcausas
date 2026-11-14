import { describe, expect, it } from 'vitest'
import { validateAnnulProceduralAct } from '@/features/cases/schemas/proceduralActAnnulment.schema'
import { toAnnulProceduralActBody } from '@/features/cases/utils/toAnnulProceduralActBody'

/**
 * CA-29.10: el motivo de la anulación es opcional y tiene hasta 500
 * caracteres (V6 §3.8). El servidor lo vuelve a controlar; esto es para
 * marcarlo en el campo sin gastar un viaje.
 */
describe('validateAnnulProceduralAct', () => {
    it('sin motivo no hay error', () => {
        expect(validateAnnulProceduralAct({ reason: '' })).toEqual({})
        expect(validateAnnulProceduralAct({ reason: '   ' })).toEqual({})
    })

    it('500 caracteres se aceptan, y los espacios de los bordes no cuentan', () => {
        expect(validateAnnulProceduralAct({ reason: `  ${'a'.repeat(500)}  ` })).toEqual({})
    })

    it('con más de 500 caracteres marca el motivo', () => {
        expect(validateAnnulProceduralAct({ reason: 'a'.repeat(501) })).toEqual({
            reason: 'Puede tener hasta 500 caracteres.',
        })
    })
})

/** CA-29.1: con o sin motivo. Sin motivo no viaja cuerpo: el contrato lo admite. */
describe('toAnnulProceduralActBody', () => {
    it('sin motivo no hay cuerpo', () => {
        expect(toAnnulProceduralActBody({ reason: '' })).toBeUndefined()
        expect(toAnnulProceduralActBody({ reason: '  ' })).toBeUndefined()
    })

    it('con motivo lo manda recortado', () => {
        expect(toAnnulProceduralActBody({ reason: '  Acto cargado dos veces. ' })).toEqual({
            reason: 'Acto cargado dos veces.',
        })
    })
})
