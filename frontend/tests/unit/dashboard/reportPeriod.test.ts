import { describe, expect, it } from 'vitest'
import {
    changeNote,
    formatDecimal,
    isPeriod,
    lastClosedPeriod,
    periodLabel,
    periodRange,
    shiftPeriod,
} from '@/features/dashboard/utils/reportPeriod'

/** Los períodos del reporte mensual (HU43, V6 §3.13). */
describe('reportPeriod', () => {
    it('reconoce la forma AAAA-MM', () => {
        expect(isPeriod('2026-08')).toBe(true)
        expect(isPeriod('2026-13')).toBe(false)
        expect(isPeriod('2026-8')).toBe(false)
        expect(isPeriod(null)).toBe(false)
    })

    it('corre meses cruzando el año', () => {
        expect(shiftPeriod('2026-01', -1)).toBe('2025-12')
        expect(shiftPeriod('2025-12', 1)).toBe('2026-01')
    })

    it('arma el rango de meses, los dos extremos incluidos', () => {
        expect(periodRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
    })

    it('"Último cerrado" es el mes anterior al en curso, si tiene reporte', () => {
        expect(lastClosedPeriod('2026-01', '2026-09')).toBe('2026-08')
        // CA-43.2: si todavía no hay ninguno cerrado, no hay "Último cerrado".
        expect(lastClosedPeriod('2026-09', '2026-09')).toBeNull()
    })

    it('rótulos y números', () => {
        expect(periodLabel('2026-08')).toBe('Agosto 2026')
        expect(changeNote(7)).toBe('+7 respecto del mes anterior')
        expect(changeNote(-1)).toBe('-1 respecto del mes anterior')
        expect(changeNote(null)).toBeNull()
        expect(formatDecimal(14.1)).toBe('14,1')
    })
})
