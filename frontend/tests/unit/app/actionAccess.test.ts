import { describe, expect, it } from 'vitest'
import { can } from '@/app/access/access'

/**
 * Los permisos por acción: lo que `ROUTE_ACCESS` no puede expresar, porque la
 * pantalla la ven todos y sólo un perfil puede operarla. Salen de la tabla de
 * permisos por perfil del contrato (V3 §4).
 */
describe('can', () => {
    /* CA-8.7: administrar clientes es sólo de la Secretaría (V3 D-05). */
    it('registrar un cliente es sólo de la Secretaría', () => {
        expect(can(['SECRETARY'], 'clients.create')).toBe(true)
        expect(can(['ADMINISTRATOR'], 'clients.create')).toBe(false)
        expect(can(['LAWYER'], 'clients.create')).toBe(false)
    })

    /* Registrar una calificación legal es sólo del Administrador (V3 D-04). Se
       opera desde la pantalla de calificaciones y desde el alta de causa. */
    it('registrar una calificación legal es sólo del Administrador', () => {
        expect(can(['ADMINISTRATOR'], 'legalQualifications.create')).toBe(true)
        expect(can(['SECRETARY'], 'legalQualifications.create')).toBe(false)
        expect(can(['LAWYER'], 'legalQualifications.create')).toBe(false)
    })
})
