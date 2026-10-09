import { describe, expect, it } from 'vitest'
import { deadlineStatus } from '@/features/cases/utils/deadlineStatus'

/**
 * El chip del vencimiento de una causa: la columna "Próximo vencimiento" del
 * listado (HU-20). Cada test dice qué criterio de aceptación cubre.
 *
 * Los días hábiles los manda el backend ya calculados; acá sólo se traducen a
 * texto y a tono, con los cortes del prototipo: vencida y hoy en rojo, hasta 5
 * días hábiles en bronce y, más lejos, sin color.
 */

/** Un vencimiento a `days` días hábiles. La fecha no interviene: el texto sale de los días. */
const dueIn = (days: number) => ({ dueDate: '2026-09-15', businessDaysRemaining: days })

describe('deadlineStatus', () => {
    /* CA-20.5: una causa sin vencimiento no es una urgencia. */
    it('sin vencimiento dice "Sin plazo abierto", sin color', () => {
        expect(deadlineStatus({ dueDate: null, businessDaysRemaining: null })).toEqual({
            label: 'Sin plazo abierto',
            tone: 'neutral',
            dot: 'hollow',
        })
    })

    /* CA-20.5: las vencidas. */
    it.each([
        [-1, 'Vencido hace 1 día'],
        [-2, 'Vencido hace 2 días'],
        [-7, 'Vencido hace 7 días'],
    ])('con %i días hábiles dice "%s", en rojo', (days, label) => {
        expect(deadlineStatus(dueIn(days))).toEqual({ label, tone: 'danger', dot: true })
    })

    /* CA-20.5: las que vencen hoy. */
    it('con 0 días hábiles dice "Vence hoy", en rojo', () => {
        expect(deadlineStatus(dueIn(0))).toEqual({ label: 'Vence hoy', tone: 'danger', dot: true })
    })

    /* CA-20.5: las que vencen en los próximos días. */
    it.each([
        [1, 'En 1 día hábil'],
        [2, 'En 2 días hábiles'],
        [5, 'En 5 días hábiles'],
    ])('con %i días hábiles dice "%s", en bronce', (days, label) => {
        expect(deadlineStatus(dueIn(days))).toEqual({ label, tone: 'warn', dot: true })
    })

    /* CA-20.5: pasados los 5 días hábiles informa cuánto falta, pero ya no la destaca. */
    it.each([
        [6, 'En 6 días hábiles'],
        [18, 'En 18 días hábiles'],
    ])('con %i días hábiles dice "%s", sin color', (days, label) => {
        expect(deadlineStatus(dueIn(days))).toEqual({ label, tone: 'neutral', dot: 'hollow' })
    })

    /* CA-20.5: sin los días no hay nada que informar, aunque llegue una fecha. */
    it('con fecha pero sin los días hábiles dice "Sin plazo abierto"', () => {
        expect(deadlineStatus({ dueDate: '2026-09-15', businessDaysRemaining: null }).label).toBe(
            'Sin plazo abierto',
        )
    })
})
