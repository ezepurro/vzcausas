import { describe, expect, it } from 'vitest'
import {
    ROLE_FIELD,
    roleChecks,
    roleLabel,
    rolesFromValues,
    roleTone,
} from '@/features/users/utils/roles'
import { LAWYER_MODES, ROLES, type UserFormValues } from '@/features/users/types/user'

const VALUES: UserFormValues = {
    fullName: '',
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    roleAdministrator: false,
    roleLawyer: false,
    roleSecretary: false,
    lawyerMode: LAWYER_MODES.link,
    lawyerId: '',
    lawyerFullName: '',
    registrationNumber: '',
}

describe('roleLabel', () => {
    it('traduce cada rol al castellano', () => {
        expect(roleLabel('ADMINISTRATOR')).toBe('Administrador')
        expect(roleLabel('LAWYER')).toBe('Abogado')
        expect(roleLabel('SECRETARY')).toBe('Secretaría')
    })
})

describe('rolesFromValues', () => {
    it('sin tildes no hay roles', () => {
        expect(rolesFromValues(VALUES)).toEqual([])
    })

    it('devuelve los tildados en el orden del contrato', () => {
        expect(rolesFromValues({ ...VALUES, roleSecretary: true, roleAdministrator: true })).toEqual([
            'ADMINISTRATOR',
            'SECRETARY',
        ])
    })
})

describe('roleChecks', () => {
    it('tilda los roles del usuario', () => {
        expect(roleChecks(['ADMINISTRATOR', 'LAWYER'])).toEqual({
            roleAdministrator: true,
            roleLawyer: true,
            roleSecretary: false,
        })
    })

    it('es la inversa de rolesFromValues', () => {
        const roles = ['LAWYER', 'SECRETARY'] as const
        expect(rolesFromValues({ ...VALUES, ...roleChecks([...roles]) })).toEqual([...roles])
    })
})

describe('ROLE_FIELD', () => {
    it('tiene un campo del formulario para cada rol', () => {
        expect(Object.keys(ROLE_FIELD).sort()).toEqual([...ROLES].sort())
    })
})

describe('roleTone', () => {
    it('administrador se destaca y el resto queda neutro', () => {
        expect(roleTone('ADMINISTRATOR')).toBe('primary')
        expect(roleTone('LAWYER')).toBe('neutral')
        expect(roleTone('SECRETARY')).toBe('neutral')
    })
})
