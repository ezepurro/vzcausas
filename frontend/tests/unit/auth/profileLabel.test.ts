import { describe, expect, it } from 'vitest'
import { profileLabel, ROLE_LABELS } from '@/features/auth/utils/profileLabel'

describe('profileLabel', () => {
    it('muestra el rótulo en castellano de un rol suelto', () => {
        expect(profileLabel(['ADMINISTRATOR'])).toBe('Administrador')
        expect(profileLabel(['LAWYER'])).toBe('Abogado')
        expect(profileLabel(['SECRETARY'])).toBe('Secretaría')
    })

    it('con administrador y abogado, elige administrador', () => {
        expect(profileLabel(['LAWYER', 'ADMINISTRATOR'])).toBe('Administrador')
    })

    it('con secretaría y abogado, elige secretaría', () => {
        expect(profileLabel(['LAWYER', 'SECRETARY'])).toBe('Secretaría')
    })

    it('el orden en que llegan los roles no cambia el resultado', () => {
        expect(profileLabel(['ADMINISTRATOR', 'SECRETARY'])).toBe(
            profileLabel(['SECRETARY', 'ADMINISTRATOR']),
        )
    })

    it('sin roles, avisa que no hay perfil asignado', () => {
        expect(profileLabel([])).toBe('Sin perfil asignado')
    })

    it('tiene un rótulo para cada rol', () => {
        expect(Object.keys(ROLE_LABELS).sort()).toEqual(['ADMINISTRATOR', 'LAWYER', 'SECRETARY'])
    })
})
