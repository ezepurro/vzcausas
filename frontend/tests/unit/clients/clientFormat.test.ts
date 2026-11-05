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
        address: '',
        phone: '',
        email: '',
    }

    it('manda el tipo y el número limpio, sin los opcionales vacíos', () => {
        expect(toCreateClientBody(VALUES)).toEqual({
            lastName: 'GÓMEZ',
            firstName: 'Ariel Fernando',
            documentType: 'DNI',
            documentNumber: '34812905',
        })
    })

    it('la dirección viaja recortada si se cargó', () => {
        expect(toCreateClientBody({ ...VALUES, address: ' Av. Colón 1250 ' }).address).toBe('Av. Colón 1250')
    })
})
