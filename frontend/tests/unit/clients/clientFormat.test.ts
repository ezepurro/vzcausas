import { describe, expect, it } from 'vitest'
import { formatClientName, formatDni, normalizeDni } from '@/features/clients/utils/clientFormat'

/* CA-8.6: el cliente se lee con el apellido primero. */
describe('formatClientName', () => {
    it('pone el apellido primero, separado por una coma', () => {
        expect(formatClientName({ lastName: 'GÓMEZ', firstName: 'Ariel Fernando' })).toBe('GÓMEZ, Ariel Fernando')
    })

    it('muestra el apellido en mayúsculas aunque haya llegado en minúsculas', () => {
        expect(formatClientName({ lastName: 'Ludueña', firstName: 'Silvia' })).toBe('LUDUEÑA, Silvia')
    })

    it('no toca los nombres', () => {
        expect(formatClientName({ lastName: 'PEREYRA', firstName: 'Marcos D.' })).toBe('PEREYRA, Marcos D.')
    })

    it('recorta los espacios de las puntas', () => {
        expect(formatClientName({ lastName: '  ACOSTA ', firstName: ' Jonathan E.  ' })).toBe('ACOSTA, Jonathan E.')
    })
})

/* CA-8.5: el DNI viaja sin puntos y se muestra con puntos. */
describe('formatDni', () => {
    it('le pone los puntos a un DNI de 8 dígitos', () => {
        expect(formatDni('34812905')).toBe('34.812.905')
    })

    it('y a uno de 7', () => {
        expect(formatDni('9876543')).toBe('9.876.543')
    })

    it('un valor que no son 7 u 8 dígitos se devuelve tal cual', () => {
        expect(formatDni('123')).toBe('123')
        expect(formatDni('34.812.905')).toBe('34.812.905')
        expect(formatDni('')).toBe('')
    })
})

describe('normalizeDni', () => {
    it('saca los puntos', () => {
        expect(normalizeDni('34.812.905')).toBe('34812905')
    })

    it('saca los espacios', () => {
        expect(normalizeDni('34 812 905')).toBe('34812905')
    })

    it('deja igual un DNI que ya son sólo dígitos', () => {
        expect(normalizeDni('34812905')).toBe('34812905')
    })

    it('no inventa nada: lo que no es punto ni espacio queda', () => {
        expect(normalizeDni('34-812-905')).toBe('34-812-905')
    })
})
