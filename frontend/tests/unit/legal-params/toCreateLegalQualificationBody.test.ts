import { describe, expect, it } from 'vitest'
import { toCreateLegalQualificationBody } from '@/features/legal-params/utils/toCreateLegalQualificationBody'

describe('toCreateLegalQualificationBody', () => {
    it('recorta el nombre y manda el plazo en meses', () => {
        expect(toCreateLegalQualificationBody({ name: '  Estafa — art. 172 CP ', years: '6', months: '6' }))
            .toEqual({ name: 'Estafa — art. 172 CP', prescriptionMonths: 78 })
    })

    it('menos de un año: sólo los meses', () => {
        expect(toCreateLegalQualificationBody({ name: 'X', years: '0', months: '8' }).prescriptionMonths).toBe(8)
    })
})
