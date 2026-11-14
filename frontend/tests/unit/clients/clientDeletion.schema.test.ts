import { describe, expect, it } from 'vitest'
import { validateDeleteClient } from '@/features/clients/schemas/clientDeletion.schema'

/**
 * CA-11.7: el motivo de la baja es opcional y tiene hasta 500 caracteres
 * (V6 §3.6, `DELETE /clients/{clientId}`). El servidor lo vuelve a controlar;
 * esto es para marcarlo en el campo sin gastar un viaje.
 *
 * @backend CA-11.5
 * (el motivo, el usuario y la fecha quedan en la auditoría: no hay endpoint
 * para consultarlos)
 */
describe('validateDeleteClient', () => {
    it('sin motivo no hay error', () => {
        expect(validateDeleteClient({ reason: '' })).toEqual({})
        expect(validateDeleteClient({ reason: '   ' })).toEqual({})
    })

    it('acepta 500 caracteres y marca el motivo con 501', () => {
        expect(validateDeleteClient({ reason: `  ${'a'.repeat(500)}  ` })).toEqual({})
        expect(validateDeleteClient({ reason: 'a'.repeat(501) })).toEqual({
            reason: 'Puede tener hasta 500 caracteres.',
        })
    })
})
