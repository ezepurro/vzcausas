import { describe, expect, it } from 'vitest'
import { toLegalQualificationFormErrors } from '@/features/legal-params/utils/toLegalQualificationFormErrors'

describe('toLegalQualificationFormErrors', () => {
    it('el nombre va al nombre y los meses del contrato van a los años', () => {
        expect(toLegalQualificationFormErrors({ name: 'a', prescriptionMonths: 'b' }))
            .toEqual({ name: 'a', years: 'b' })
    })

    it('descarta lo que no es un campo, y sin detalles no hay errores', () => {
        expect(toLegalQualificationFormErrors({ body: 'Vacío.' })).toEqual({})
        expect(toLegalQualificationFormErrors(null)).toEqual({})
    })
})
