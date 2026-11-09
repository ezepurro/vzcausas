import { describe, expect, it } from 'vitest'
import { formatInstantDate, formatTime } from '@/shared/lib/dates'

/**
 * La hora y el día de un instante ISO 8601, en la zona de quien lo lee (HU38:
 * "Sincronizado con Drive · 10:42" y la fecha de cada documento).
 *
 * El instante se arma con la hora local, así el test da lo mismo en cualquier
 * zona horaria.
 */
const NINE_SEPTEMBER_10_42 = new Date(2026, 8, 9, 10, 42).toISOString()

describe('formatTime', () => {
    it('muestra la hora local del instante', () => {
        expect(formatTime(NINE_SEPTEMBER_10_42)).toBe('10:42')
    })

    it('sin instante, o con uno inválido, muestra el guion', () => {
        expect(formatTime(null)).toBe('—')
        expect(formatTime('no es una fecha')).toBe('—')
    })
})

describe('formatInstantDate', () => {
    it('muestra el día local del instante, sin la hora', () => {
        expect(formatInstantDate(NINE_SEPTEMBER_10_42)).toBe('09/09/2026')
    })

    it('sin instante, o con uno inválido, muestra el guion', () => {
        expect(formatInstantDate(null)).toBe('—')
        expect(formatInstantDate('no es una fecha')).toBe('—')
    })
})
