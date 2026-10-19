import { describe, expect, it } from 'vitest'
import { validateInterruptiveAct } from '@/features/cases/schemas/interruptiveAct.schema'
import type { InterruptiveActFormValues } from '@/features/cases/types/interruptiveAct'
import { usePrototypeToday } from '../../setup/clock'

/**
 * La validación del formulario "Registrar acto interruptivo" (HU-31), antes de
 * mandar nada al servidor. Los mensajes son los del contrato (V4 §3.9).
 */

const VALID: InterruptiveActFormValues = {
    name: 'Citación a juicio',
    actDate: '2026-09-15',
    notes: '',
}

describe('validateInterruptiveAct', () => {
    usePrototypeToday()

    it('un acto completo no tiene errores; las observaciones son opcionales', () => {
        expect(validateInterruptiveAct(VALID)).toEqual({})
    })

    // CA-31.8
    it('la denominación y la fecha son obligatorias', () => {
        expect(validateInterruptiveAct({ ...VALID, name: '   ', actDate: '' })).toEqual({
            name: 'El acto interruptivo es obligatorio.',
            actDate: 'La fecha del acto es obligatoria.',
        })
    })

    // CA-31.8
    it('la denominación admite hasta 255 caracteres y las observaciones hasta 2000', () => {
        expect(validateInterruptiveAct({ ...VALID, name: 'a'.repeat(255), notes: 'b'.repeat(2000) })).toEqual({})
        expect(validateInterruptiveAct({ ...VALID, name: 'a'.repeat(256), notes: 'b'.repeat(2001) })).toEqual({
            name: 'Puede tener hasta 255 caracteres.',
            notes: 'Puede tener hasta 2000 caracteres.',
        })
    })

    // CA-31.8: hoy sí, mañana no.
    it('la fecha no puede ser posterior a hoy', () => {
        expect(validateInterruptiveAct({ ...VALID, actDate: '2026-09-15' })).toEqual({})
        expect(validateInterruptiveAct({ ...VALID, actDate: '2026-09-16' })).toEqual({
            actDate: 'No puede ser posterior a hoy.',
        })
    })
})
