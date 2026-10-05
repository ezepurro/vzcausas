import { describe, expect, it } from 'vitest'
import { toCreateClientBody } from '@/features/clients/utils/toCreateClientBody'
import type { ClientFormValues } from '@/features/clients/types/client'

const VALUES: ClientFormValues = {
    lastName: 'BENÍTEZ',
    firstName: 'Rodrigo E.',
    dni: '31556208',
    phone: '351 401-5573',
    email: 'rbenitez@gmail.com',
}

/* Del formulario al cuerpo de `POST /clients` (V3 §3.6). Para cuando se la
   llama, `validateClient` ya dijo que los valores sirven. */
describe('toCreateClientBody', () => {
    it('arma el cuerpo del POST con los cinco campos', () => {
        expect(toCreateClientBody(VALUES)).toEqual({
            lastName: 'BENÍTEZ',
            firstName: 'Rodrigo E.',
            dni: '31556208',
            phone: '351 401-5573',
            email: 'rbenitez@gmail.com',
        })
    })

    it('recorta los espacios de todos los campos', () => {
        expect(
            toCreateClientBody({
                lastName: '  BENÍTEZ ',
                firstName: ' Rodrigo E.  ',
                dni: ' 31556208 ',
                phone: '  351 401-5573 ',
                email: ' rbenitez@gmail.com  ',
            }),
        ).toEqual({
            lastName: 'BENÍTEZ',
            firstName: 'Rodrigo E.',
            dni: '31556208',
            phone: '351 401-5573',
            email: 'rbenitez@gmail.com',
        })
    })

    /* CA-8.5: el DNI viaja sin puntos, se haya escrito como se haya escrito. */
    it('manda el DNI sólo con dígitos', () => {
        expect(toCreateClientBody({ ...VALUES, dni: '31.556.208' }).dni).toBe('31556208')
        expect(toCreateClientBody({ ...VALUES, dni: '31 556 208' }).dni).toBe('31556208')
    })

    it('un teléfono o un correo vacío no viaja', () => {
        const body = toCreateClientBody({ ...VALUES, phone: '', email: '' })

        expect(body).toEqual({ lastName: 'BENÍTEZ', firstName: 'Rodrigo E.', dni: '31556208' })
        expect(body).not.toHaveProperty('phone')
        expect(body).not.toHaveProperty('email')
    })

    it('un teléfono o un correo con sólo espacios tampoco', () => {
        const body = toCreateClientBody({ ...VALUES, phone: '   ', email: '  ' })

        expect(body).not.toHaveProperty('phone')
        expect(body).not.toHaveProperty('email')
    })

    it('manda uno de los dos opcionales si el otro falta', () => {
        expect(toCreateClientBody({ ...VALUES, email: '' })).toEqual({
            lastName: 'BENÍTEZ',
            firstName: 'Rodrigo E.',
            dni: '31556208',
            phone: '351 401-5573',
        })
    })

    /* `clientSince`, `activeCases` y `active` los pone el backend. */
    it('no agrega campos que no son del cuerpo del contrato', () => {
        expect(Object.keys(toCreateClientBody(VALUES)).sort()).toEqual([
            'dni',
            'email',
            'firstName',
            'lastName',
            'phone',
        ])
    })
})
