import { describe, expect, it } from 'vitest'
import { isValid, validateClient } from '@/features/clients/schemas/client.schema'
import type { ClientFormValues } from '@/features/clients/types/client'

/** Un alta válida, para ir rompiéndola de a un campo. */
const VALID: ClientFormValues = {
    lastName: 'GÓMEZ',
    firstName: 'Ariel Fernando',
    dni: '34812905',
    phone: '351 415-2288',
    email: 'afgomez@gmail.com',
}

/* Las restricciones son las del cuerpo de `POST /clients` (V3 §3.6): es el
   criterio CA-8.3 de HU-8. */
describe('validateClient', () => {
    it('no devuelve errores con todos los datos válidos', () => {
        expect(validateClient(VALID)).toEqual({})
    })

    it('el teléfono y el correo son opcionales', () => {
        expect(validateClient({ ...VALID, phone: '', email: '' })).toEqual({})
        expect(validateClient({ ...VALID, phone: '   ', email: '   ' })).toEqual({})
    })

    describe('apellido', () => {
        it('es obligatorio', () => {
            expect(validateClient({ ...VALID, lastName: '' }).lastName).toBe('El apellido es obligatorio.')
            expect(validateClient({ ...VALID, lastName: '   ' }).lastName).toBe('El apellido es obligatorio.')
        })

        it('admite hasta 100 caracteres', () => {
            expect(validateClient({ ...VALID, lastName: 'a'.repeat(100) }).lastName).toBeUndefined()
            expect(validateClient({ ...VALID, lastName: 'a'.repeat(101) }).lastName).toBe(
                'Puede tener hasta 100 caracteres.',
            )
        })
    })

    describe('nombres', () => {
        it('son obligatorios', () => {
            expect(validateClient({ ...VALID, firstName: '' }).firstName).toBe('Los nombres son obligatorios.')
            expect(validateClient({ ...VALID, firstName: '   ' }).firstName).toBe('Los nombres son obligatorios.')
        })

        it('admiten hasta 100 caracteres', () => {
            expect(validateClient({ ...VALID, firstName: 'a'.repeat(100) }).firstName).toBeUndefined()
            expect(validateClient({ ...VALID, firstName: 'a'.repeat(101) }).firstName).toBe(
                'Puede tener hasta 100 caracteres.',
            )
        })
    })

    describe('DNI', () => {
        it('es obligatorio', () => {
            expect(validateClient({ ...VALID, dni: '' }).dni).toBe('El DNI es obligatorio.')
            expect(validateClient({ ...VALID, dni: '   ' }).dni).toBe('El DNI es obligatorio.')
        })

        it('acepta 7 y 8 dígitos', () => {
            expect(validateClient({ ...VALID, dni: '9876543' }).dni).toBeUndefined()
            expect(validateClient({ ...VALID, dni: '34812905' }).dni).toBeUndefined()
        })

        /* El DNI viaja sin puntos, pero la persona lo escribe como lo lee: los
           puntos y los espacios se sacan antes de validar. */
        it('lo acepta escrito con puntos o con espacios', () => {
            expect(validateClient({ ...VALID, dni: '34.812.905' }).dni).toBeUndefined()
            expect(validateClient({ ...VALID, dni: '34 812 905' }).dni).toBeUndefined()
            expect(validateClient({ ...VALID, dni: ' 9.876.543 ' }).dni).toBeUndefined()
        })

        it.each(['123456', '123456789', '12.345', 'abc', '3481290a'])('rechaza %s', (dni) => {
            expect(validateClient({ ...VALID, dni }).dni).toBe('El DNI tiene 7 u 8 números.')
        })
    })

    describe('teléfono', () => {
        it('es texto libre', () => {
            expect(validateClient({ ...VALID, phone: '0351 448-1200 int. 214' }).phone).toBeUndefined()
        })

        it('admite hasta 50 caracteres', () => {
            expect(validateClient({ ...VALID, phone: '1'.repeat(50) }).phone).toBeUndefined()
            expect(validateClient({ ...VALID, phone: '1'.repeat(51) }).phone).toBe(
                'Puede tener hasta 50 caracteres.',
            )
        })
    })

    describe('correo electrónico', () => {
        it.each(['no-es-un-correo', 'sin@dominio', '@gmail.com', 'con espacios@gmail.com'])(
            'rechaza %s',
            (email) => {
                expect(validateClient({ ...VALID, email }).email).toBe(
                    'El formato del correo electrónico no es válido.',
                )
            },
        )

        it('acepta un correo con el formato correcto', () => {
            expect(validateClient({ ...VALID, email: ' rbenitez@gmail.com ' }).email).toBeUndefined()
        })
    })

    it('enviado vacío marca los tres obligatorios y nada más', () => {
        expect(validateClient({ lastName: '', firstName: '', dni: '', phone: '', email: '' })).toEqual({
            lastName: 'El apellido es obligatorio.',
            firstName: 'Los nombres son obligatorios.',
            dni: 'El DNI es obligatorio.',
        })
    })
})

describe('isValid', () => {
    it('es true sin errores y false con alguno', () => {
        expect(isValid({})).toBe(true)
        expect(isValid({ dni: 'El DNI es obligatorio.' })).toBe(false)
    })
})
