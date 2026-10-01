import { describe, expect, it } from 'vitest'
import {
    addBusinessDays,
    addCalendarDays,
    addMonths,
    businessDaysUntil,
    computeDueDate,
    subtractBusinessDays,
} from '@/shared/mocks'
import { isIsoDate, parseIsoDate } from '@/shared/mocks/calendar'

/* Septiembre de 2026: el 15 es martes; el 12 y el 13, sábado y domingo. */

describe('calendario del mock', () => {
    describe('fechas sin hora', () => {
        it('acepta sólo fechas que existen', () => {
            expect(isIsoDate('2026-09-15')).toBe(true)
            expect(isIsoDate('2026-02-31')).toBe(false)
            expect(isIsoDate('15/09/2026')).toBe(false)
            expect(isIsoDate('')).toBe(false)
            expect(isIsoDate(null)).toBe(false)
        })

        it('arma la fecha en la zona local, sin correrla un día', () => {
            const date = parseIsoDate('2026-09-15')

            expect(date?.getDate()).toBe(15)
            expect(date?.getMonth()).toBe(8)
        })
    })

    describe('días hábiles', () => {
        it('cuenta a partir del día siguiente y saltea el fin de semana', () => {
            // Miércoles 9 + 5 hábiles: jueves, viernes, lunes, martes, miércoles 16.
            expect(addBusinessDays('2026-09-09', 5)).toBe('2026-09-16')
            // Viernes 11 + 1 hábil: lunes 14.
            expect(addBusinessDays('2026-09-11', 1)).toBe('2026-09-14')
        })

        it('con cero días devuelve la misma fecha', () => {
            expect(addBusinessDays('2026-09-12', 0)).toBe('2026-09-12')
        })

        it('restar días hábiles es la inversa de sumarlos', () => {
            expect(subtractBusinessDays('2026-09-15', 4)).toBe('2026-09-09')
            expect(addBusinessDays(subtractBusinessDays('2026-09-15', 4), 4)).toBe('2026-09-15')
        })
    })

    describe('businessDaysUntil', () => {
        it('devuelve los días del prototipo, contados desde el martes 15/09/2026', () => {
            const today = '2026-09-15'

            expect(businessDaysUntil('2026-09-15', today)).toBe(0)
            expect(businessDaysUntil('2026-09-16', today)).toBe(1)
            expect(businessDaysUntil('2026-09-18', today)).toBe(3)
            expect(businessDaysUntil('2026-09-29', today)).toBe(10)
        })

        it('es negativo si ya venció, sin contar el fin de semana', () => {
            // Viernes 11: lunes 14 y viernes 11 son los dos días hábiles que pasaron.
            expect(businessDaysUntil('2026-09-11', '2026-09-15')).toBe(-2)
        })
    })

    describe('computeDueDate', () => {
        it('suma días hábiles', () => {
            expect(computeDueDate('2026-09-09', 5, 'BUSINESS')).toBe('2026-09-16')
        })

        it('suma días corridos', () => {
            expect(computeDueDate('2026-09-09', 30, 'CONSECUTIVE')).toBe('2026-10-09')
            expect(addCalendarDays('2026-09-09', 30)).toBe('2026-10-09')
        })

        it('un estado sin plazo no vence', () => {
            expect(computeDueDate('2026-09-09', 0, 'NONE')).toBeNull()
        })
    })

    it('la prescripción suma meses conservando el día', () => {
        expect(addMonths('2021-02-27', 96)).toBe('2029-02-27')
        expect(addMonths('2025-11-14', 78)).toBe('2032-05-14')
    })
})
