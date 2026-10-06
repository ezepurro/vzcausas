import { describe, expect, it } from 'vitest'
import { toFormErrors } from '@/features/proceedings/utils/toFormErrors'

describe('toFormErrors', () => {
    it('el estado del contrato va al combobox', () => {
        expect(toFormErrors({ proceduralStateId: 'Es terminal.' })).toEqual({ stateText: 'Es terminal.' })
        expect(toFormErrors({ customState: 'Coincide con un estado.' })).toEqual({ stateText: 'Coincide con un estado.' })
    })

    it('las fechas y las observaciones van a su campo', () => {
        expect(toFormErrors({ actDate: 'a', notificationDate: 'b', manualDueDate: 'c', notes: 'd' })).toEqual({
            actDate: 'a',
            notificationDate: 'b',
            manualDueDate: 'c',
            notes: 'd',
        })
    })

    it('descarta lo que no es un campo, y sin detalles no hay errores', () => {
        expect(toFormErrors({ caseId: 'Debe ser un número entero válido.' })).toEqual({})
        expect(toFormErrors(null)).toEqual({})
    })
})
