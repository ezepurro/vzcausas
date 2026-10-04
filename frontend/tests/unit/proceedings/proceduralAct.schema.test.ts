import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isValid, validateProceduralAct } from '@/features/proceedings/schemas/proceduralAct.schema'
import { EMPTY_VALUES } from './values'

const VALID = { ...EMPTY_VALUES, stateText: 'Cédula de notificación', proceduralStateId: '2' }
const CRIMINAL = { jurisdiction: 'CRIMINAL', opensTerm: true } as const
const ADMINISTRATIVE = { jurisdiction: 'ADMINISTRATIVE', opensTerm: true } as const

describe('validateProceduralAct', () => {
    // El "hoy" de las reglas de fecha: martes 15/09/2026, como el prototipo.
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('acepta un acto completo', () => {
        expect(isValid(validateProceduralAct(VALID, CRIMINAL))).toBe(true)
    })

    it('pide el estado y no deja pasar de 255 caracteres', () => {
        expect(validateProceduralAct({ ...VALID, stateText: '  ' }, CRIMINAL).stateText)
            .toBe('Elegí de la lista o escribí el estado al que pasa la causa.')
        expect(validateProceduralAct({ ...VALID, stateText: 'a'.repeat(256) }, CRIMINAL).stateText)
            .toBe('Puede tener hasta 255 caracteres.')
    })

    it('pide la fecha del acto y no la acepta futura', () => {
        expect(validateProceduralAct({ ...VALID, actDate: '' }, CRIMINAL).actDate)
            .toBe('La fecha del acto es obligatoria.')
        expect(validateProceduralAct({ ...VALID, actDate: '2026-09-16' }, CRIMINAL).actDate)
            .toBe('La fecha del acto no puede ser posterior a hoy.')
    })

    it('en el administrativo pide la notificación sólo si el estado abre plazo', () => {
        expect(validateProceduralAct(VALID, ADMINISTRATIVE).notificationDate)
            .toBe('En el fuero administrativo el plazo corre desde la notificación: cargá su fecha.')
        expect(validateProceduralAct(VALID, { ...ADMINISTRATIVE, opensTerm: false }).notificationDate)
            .toBeUndefined()
    })

    it('la notificación va entre la fecha del acto y hoy', () => {
        expect(validateProceduralAct({ ...VALID, notificationDate: '2026-09-16' }, ADMINISTRATIVE).notificationDate)
            .toBe('La fecha de notificación no puede ser posterior a hoy.')
        expect(validateProceduralAct({ ...VALID, actDate: '2026-09-10', notificationDate: '2026-09-09' }, ADMINISTRATIVE).notificationDate)
            .toBe('La notificación no puede ser anterior al acto.')
    })

    it('fuera del administrativo ignora la notificación', () => {
        expect(validateProceduralAct({ ...VALID, notificationDate: '2026-09-20' }, CRIMINAL).notificationDate)
            .toBeUndefined()
    })

    it('el ajuste manual pide fecha, no anterior a desde dónde corre el plazo', () => {
        expect(validateProceduralAct({ ...VALID, manualDue: true }, CRIMINAL).manualDueDate)
            .toBe('Cargá la fecha de vencimiento o destildá el ajuste manual.')
        expect(validateProceduralAct({ ...VALID, manualDue: true, manualDueDate: '2026-09-14' }, CRIMINAL).manualDueDate)
            .toBe('El vencimiento no puede ser anterior al acto.')
        expect(
            validateProceduralAct(
                { ...VALID, actDate: '2026-09-10', notificationDate: '2026-09-12', manualDue: true, manualDueDate: '2026-09-11' },
                ADMINISTRATIVE,
            ).manualDueDate,
        ).toBe('El vencimiento no puede ser anterior a la notificación.')
    })

    it('sin el ajuste tildado no mira la fecha manual', () => {
        expect(validateProceduralAct({ ...VALID, manualDueDate: '2020-01-01' }, CRIMINAL).manualDueDate)
            .toBeUndefined()
    })

    it('las observaciones llegan hasta 2000 caracteres', () => {
        expect(validateProceduralAct({ ...VALID, notes: 'a'.repeat(2000) }, CRIMINAL).notes).toBeUndefined()
        expect(validateProceduralAct({ ...VALID, notes: 'a'.repeat(2001) }, CRIMINAL).notes)
            .toBe('Puede tener hasta 2000 caracteres.')
    })
})
