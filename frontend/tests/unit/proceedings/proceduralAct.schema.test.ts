import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateProceduralAct } from '@/features/proceedings/schemas/proceduralAct.schema'
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
})
