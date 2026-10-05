import { describe, expect, it } from 'vitest'
import { hasNoFieldErrors, toFormErrors } from '@/features/legal-params/utils/toFormErrors'

describe('toFormErrors', () => {
    it('sin details devuelve un objeto vacío', () => {
        expect(toFormErrors(null)).toEqual({})
    })

    it('pasa los campos que se llaman igual en el contrato y en el formulario', () => {
        expect(
            toFormErrors({
                name: 'Nombre inválido',
                timeLimitDays: 'Plazo inválido',
                dayType: 'Tipo inválido',
                terminal: 'Cierre inválido',
            }),
        ).toEqual({
            name: 'Nombre inválido',
            timeLimitDays: 'Plazo inválido',
            dayType: 'Tipo inválido',
            terminal: 'Cierre inválido',
        })
    })

    it('descarta las claves que no son campos del formulario', () => {
        expect(
            toFormErrors({ body: 'Hay que mandar al menos un campo.', jurisdiction: 'x', position: 'y' }),
        ).toEqual({})
    })
})

describe('hasNoFieldErrors', () => {
    it('es true con un objeto vacío y false con algún error', () => {
        expect(hasNoFieldErrors({})).toBe(true)
        expect(hasNoFieldErrors({ name: 'x' })).toBe(false)
    })
})
