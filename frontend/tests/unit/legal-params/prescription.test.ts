import { describe, expect, it } from 'vitest'
import { toPrescriptionMonths } from '@/features/legal-params/utils/prescription'

describe('toPrescriptionMonths', () => {
    it('suma los años y los meses del formulario', () => {
        expect(toPrescriptionMonths('6', '6')).toBe(78)
        expect(toPrescriptionMonths(' 2 ', '')).toBe(24)
    })
})
