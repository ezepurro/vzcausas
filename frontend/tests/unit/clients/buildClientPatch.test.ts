import { describe, expect, it } from 'vitest'
import { buildClientPatch, hasChanges } from '@/features/clients/utils/buildClientPatch'
import type { Client, ClientFormValues } from '@/features/clients/types/client'

/**
 * El parche de "Modificar cliente" (HU10) manda sólo lo que cambió: un PATCH
 * vacío es un 400 (CA-10.1) y `clientSince` no viaja nunca (CA-10.8).
 *
 * @backend CA-10.2 CA-10.5 CA-10.9 CA-10.10
 * (el dato se guarda una sola vez, la auditoría, la carátula y la carpeta de
 * sus causas: los resuelve el backend al recibir el parche)
 */

const GOMEZ: Client = {
    id: 1,
    lastName: 'GÓMEZ',
    firstName: 'Ariel Fernando',
    documentType: 'DNI',
    documentNumber: '34812905',
    address: 'Av. Colón 1250, Córdoba',
    phone: '351 415-2288',
    email: 'afgomez@gmail.com',
    clientSince: '2021-03-12',
    activeCases: 2,
    active: true,
}

/** El formulario recién abierto: los datos del cliente, tal cual. */
const SAME: ClientFormValues = {
    lastName: 'GÓMEZ',
    firstName: 'Ariel Fernando',
    documentType: 'DNI',
    documentNumber: '34812905',
    address: 'Av. Colón 1250, Córdoba',
    phone: '351 415-2288',
    email: 'afgomez@gmail.com',
}

describe('buildClientPatch', () => {
    // CA-10.1: una petición sin ningún campo es un 400, así que no se manda.
    it('sin cambios devuelve un parche vacío', () => {
        const patch = buildClientPatch(GOMEZ, SAME)
        expect(patch).toEqual({})
        expect(hasChanges(patch)).toBe(false)
    })

    // CA-10.1: un campo omitido no cambia.
    it('manda sólo los campos que cambiaron', () => {
        const patch = buildClientPatch(GOMEZ, { ...SAME, phone: '351 400-1122', address: 'Bv. San Juan 1240, Córdoba' })
        expect(patch).toEqual({ phone: '351 400-1122', address: 'Bv. San Juan 1240, Córdoba' })
        expect(hasChanges(patch)).toBe(true)
    })

    // CA-10.1: se recorta ANTES de comparar.
    it('los espacios de más no cuentan como cambio, y lo cambiado viaja recortado', () => {
        expect(buildClientPatch(GOMEZ, { ...SAME, lastName: ' GÓMEZ ', address: 'Av. Colón 1250, Córdoba  ' })).toEqual({})
        expect(buildClientPatch(GOMEZ, { ...SAME, lastName: '  GÓMEZ PAZ ' })).toEqual({ lastName: 'GÓMEZ PAZ' })
    })

    // CA-10.1: `email` en `null` lo borra.
    it('vaciar el correo manda null; sin correo, dejarlo vacío no es un cambio', () => {
        expect(buildClientPatch(GOMEZ, { ...SAME, email: '  ' })).toEqual({ email: null })
        expect(buildClientPatch({ ...GOMEZ, email: null }, { ...SAME, email: '' })).toEqual({})
    })

    // CA-10.7: el documento propio no es un conflicto, y tampoco un cambio.
    it('el mismo DNI escrito con puntos no viaja', () => {
        expect(buildClientPatch(GOMEZ, { ...SAME, documentNumber: '34.812.905' })).toEqual({})
    })

    // CA-10.3: el documento se puede editar; el número viaja limpio.
    it('cambiar sólo el tipo manda sólo el tipo, y un número nuevo viaja limpio', () => {
        expect(buildClientPatch(GOMEZ, { ...SAME, documentType: 'PASSPORT' })).toEqual({ documentType: 'PASSPORT' })
        expect(buildClientPatch(GOMEZ, { ...SAME, documentNumber: '35.778.120' })).toEqual({ documentNumber: '35778120' })
        expect(buildClientPatch(GOMEZ, { ...SAME, documentType: 'PASSPORT', documentNumber: 'aae 482915' })).toEqual({
            documentType: 'PASSPORT',
            documentNumber: 'AAE482915',
        })
    })

    // CA-10.8: enviar `clientSince` es un 400.
    it('clientSince no viaja nunca, aunque cambie todo lo demás', () => {
        const patch = buildClientPatch(GOMEZ, {
            lastName: 'GÓMEZ PAZ',
            firstName: 'Ariel',
            documentType: 'PASSPORT',
            documentNumber: 'AAE482915',
            address: 'Bv. San Juan 1240, Córdoba',
            phone: '351 400-1122',
            email: 'ariel@gmail.com',
        })
        expect(patch).not.toHaveProperty('clientSince')
        expect(Object.keys(patch).sort()).toEqual(
            ['address', 'documentNumber', 'documentType', 'email', 'firstName', 'lastName', 'phone'],
        )
    })
})
