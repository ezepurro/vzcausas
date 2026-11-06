import { describe, expect, it } from 'vitest'
import { formatDocument, normalizeDocumentNumber } from '@/features/clients/utils/clientFormat'
import { toCreateClientBody } from '@/features/clients/utils/toCreateClientBody'

describe('formatDocument', () => {
    it('el DNI con puntos, precedido por el tipo', () => {
        expect(formatDocument({ documentType: 'DNI', documentNumber: '34812905' })).toBe('DNI 34.812.905')
    })

    it('el pasaporte tal como se guarda', () => {
        expect(formatDocument({ documentType: 'PASSPORT', documentNumber: 'AAE482915' })).toBe('Pasaporte AAE482915')
    })
})

describe('normalizeDocumentNumber', () => {
    it('al DNI le saca los puntos y los espacios', () => {
        expect(normalizeDocumentNumber('DNI', ' 34.812 905 ')).toBe('34812905')
    })

    it('al pasaporte le saca los espacios y lo pasa a mayúsculas', () => {
        expect(normalizeDocumentNumber('PASSPORT', ' aae 482915 ')).toBe('AAE482915')
    })
})

describe('toCreateClientBody', () => {
    const VALUES = {
        lastName: ' GÓMEZ ',
        firstName: 'Ariel Fernando',
        documentType: 'DNI',
        documentNumber: '34.812.905',
        address: ' Av. Colón 1250 ',
        phone: ' 351 415-2288 ',
        email: '',
    }

    it('manda el tipo, el número limpio y la dirección y el teléfono recortados, sin el correo vacío', () => {
        expect(toCreateClientBody(VALUES)).toEqual({
            lastName: 'GÓMEZ',
            firstName: 'Ariel Fernando',
            documentType: 'DNI',
            documentNumber: '34812905',
            address: 'Av. Colón 1250',
            phone: '351 415-2288',
        })
    })

    it('el correo viaja recortado si se cargó', () => {
        expect(toCreateClientBody({ ...VALUES, email: ' afgomez@gmail.com ' }).email).toBe('afgomez@gmail.com')
    })
})
