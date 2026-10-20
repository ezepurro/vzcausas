import { describe, expect, it } from 'vitest'
import { toFormErrors } from '@/features/documents/utils/toFormErrors'

describe('toFormErrors (modelo formal)', () => {
    it('pasa los campos del formulario', () => {
        expect(toFormErrors({ name: 'El nombre del modelo es obligatorio.', jurisdictions: 'Elegí al menos un fuero.' })).toEqual({
            name: 'El nombre del modelo es obligatorio.',
            jurisdictions: 'Elegí al menos un fuero.',
        })
    })

    it('descarta la casilla "copiar en las causas nuevas", que no tiene dónde mostrarse', () => {
        expect(toFormErrors({ copyToNewCases: 'Debe ser verdadero o falso.' })).toEqual({})
        expect(toFormErrors(null)).toEqual({})
    })
})
