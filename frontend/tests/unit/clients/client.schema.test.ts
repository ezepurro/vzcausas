import { describe, expect, it } from 'vitest'
import { validateClient } from '@/features/clients/schemas/client.schema'
import type { ClientFormValues } from '@/features/clients/types/client'

/** Un alta válida, para ir rompiéndola de a un campo. */
const VALID: ClientFormValues = {
    lastName: 'GÓMEZ',
    firstName: 'Ariel Fernando',
    documentType: 'DNI',
    documentNumber: '34812905',
    address: 'Av. Colón 1250, Córdoba',
    phone: '351 415-2288',
    email: 'afgomez@gmail.com',
}

/* Las restricciones son las del cuerpo de `POST /clients` (V3 §3.6): es el
   criterio CA-8.3 de HU-8. */
describe('validateClient', () => {
    describe('DNI', () => {
        it('acepta 7 y 8 dígitos', () => {
            expect(validateClient({ ...VALID, documentNumber: '9876543' }).documentNumber).toBeUndefined()
            expect(validateClient({ ...VALID, documentNumber: '34812905' }).documentNumber).toBeUndefined()
        })

        /* El DNI viaja sin puntos, pero la persona lo escribe como lo lee: los
           puntos y los espacios se sacan antes de validar. */
        it('lo acepta escrito con puntos o con espacios', () => {
            expect(validateClient({ ...VALID, documentNumber: '34.812.905' }).documentNumber).toBeUndefined()
            expect(validateClient({ ...VALID, documentNumber: '34 812 905' }).documentNumber).toBeUndefined()
            expect(validateClient({ ...VALID, documentNumber: ' 9.876.543 ' }).documentNumber).toBeUndefined()
        })

        it.each(['123456789', '3481290a'])('rechaza %s', (documentNumber) => {
            expect(validateClient({ ...VALID, documentNumber }).documentNumber).toBe('El DNI tiene 7 u 8 números.')
        })
    })

    describe('pasaporte', () => {
        const PASSPORT: ClientFormValues = { ...VALID, documentType: 'PASSPORT', documentNumber: 'AAE482915' }

        /* Se escribe como se lee: los espacios se sacan y las minúsculas se
           pasan a mayúsculas antes de validar. */
        it.each(['AAE482915', 'aae482915', 'AAE 482915', 'X12345'])('acepta %s', (documentNumber) => {
            expect(validateClient({ ...PASSPORT, documentNumber }).documentNumber).toBeUndefined()
        })

        it.each(['AB123', 'AAE-482915', 'A'.repeat(21)])('rechaza %s', (documentNumber) => {
            expect(validateClient({ ...PASSPORT, documentNumber }).documentNumber).toBe(
                'El pasaporte tiene de 6 a 20 letras y números.',
            )
        })
    })

    it('pide el número de documento', () => {
        expect(validateClient({ ...VALID, documentNumber: '  ' }).documentNumber).toBe(
            'El número de documento es obligatorio.',
        )
    })

    it('rechaza un tipo de documento que no es DNI ni pasaporte', () => {
        expect(validateClient({ ...VALID, documentType: 'LE' }).documentType).toBe('Elegí el tipo de documento.')
    })

    describe('dirección', () => {
        it('es opcional', () => {
            expect(validateClient({ ...VALID, address: '' }).address).toBeUndefined()
        })

        it('acepta hasta 255 caracteres', () => {
            expect(validateClient({ ...VALID, address: 'a'.repeat(255) }).address).toBeUndefined()
            expect(validateClient({ ...VALID, address: 'a'.repeat(256) }).address).toBe(
                'Puede tener hasta 255 caracteres.',
            )
        })
    })

    describe('correo electrónico', () => {
        it.each(['sin@dominio'])(
            'rechaza %s',
            (email) => {
                expect(validateClient({ ...VALID, email }).email).toBe(
                    'El formato del correo electrónico no es válido.',
                )
            },
        )
    })
})
