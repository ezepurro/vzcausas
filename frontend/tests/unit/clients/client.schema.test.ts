import { describe, expect, it } from 'vitest'
import { validateClient } from '@/features/clients/schemas/client.schema'
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
    describe('DNI', () => {
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

        it.each(['123456789', '3481290a'])('rechaza %s', (dni) => {
            expect(validateClient({ ...VALID, dni }).dni).toBe('El DNI tiene 7 u 8 números.')
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
