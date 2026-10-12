import { describe, expect, it } from 'vitest'
import { can } from '@/app/access/access'

/**
 * Los permisos por acción: lo que `ROUTE_ACCESS` no puede expresar, porque la
 * pantalla la ven todos y sólo un perfil puede operarla. Salen de la tabla de
 * permisos por perfil del contrato (V3 §4).
 */
describe('can', () => {
    /* Registrar, modificar y dar de baja abogados es sólo del Administrador;
       consultarlos, de los tres perfiles (V3 §4, matriz del 11/10/2026). */
    it('registrar un abogado es sólo del Administrador', () => {
        expect(can(['ADMINISTRATOR'], 'lawyers.create')).toBe(true)
        expect(can(['SECRETARY'], 'lawyers.create')).toBe(false)
        expect(can(['LAWYER'], 'lawyers.create')).toBe(false)
    })
})
