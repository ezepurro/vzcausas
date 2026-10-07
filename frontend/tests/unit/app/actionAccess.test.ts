import { describe, expect, it } from 'vitest'
import { ACTION_ACCESS, can } from '@/app/access/access'
import { ROLES } from '@/features/auth/types/session'

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

    /* Registrar una causa la hace cualquier perfil (RN11, V3 §3.7): no es un
       permiso por rol, así que no está declarada acá. */
    it('registrar una causa no es una acción de un solo perfil', () => {
        expect(Object.keys(ACTION_ACCESS)).not.toContain('cases.create')
    })

    it('con varios roles alcanza con que uno habilite la acción', () => {
        expect(can(['SECRETARY', 'LAWYER'], 'clients.create')).toBe(true)
        // Lo habitual en el estudio, administrador y abogado a la vez, no alcanza.
        expect(can(['ADMINISTRATOR', 'LAWYER'], 'clients.create')).toBe(false)
    })

    it('sin roles no se puede ninguna acción', () => {
        for (const action of Object.keys(ACTION_ACCESS) as (keyof typeof ACTION_ACCESS)[]) {
            expect(can([], action), action).toBe(false)
        }
    })

    it('cada acción declara roles que existen', () => {
        for (const roles of Object.values(ACTION_ACCESS)) {
            expect(roles.length).toBeGreaterThan(0)
            for (const role of roles) expect(ROLES).toContain(role)
        }
    })
})
