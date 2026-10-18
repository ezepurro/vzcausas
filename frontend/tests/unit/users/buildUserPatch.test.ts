import { describe, expect, it } from 'vitest'
import { buildUserPatch } from '@/features/users/utils/buildUserPatch'
import { LAWYER_MODES, type User, type UserFormValues } from '@/features/users/types/user'

const ORIGINAL: User = {
    id: 1,
    username: 'fvazquez',
    fullName: 'Fernando G. Vázquez',
    email: 'fvazquez@vazquezzarate.com',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    lawyer: { id: 1, fullName: 'Dr. Fernando G. Vázquez', registrationNumber: '1-28114' },
    lastLoginAt: null,
    active: true,
}

/** Lo que precarga el formulario al abrir la edición de ORIGINAL. */
const UNCHANGED: UserFormValues = {
    fullName: 'Fernando G. Vázquez',
    username: 'fvazquez',
    email: 'fvazquez@vazquezzarate.com',
    password: '',
    passwordConfirm: '',
    roleAdministrator: true,
    roleLawyer: true,
    roleSecretary: false,
    lawyerMode: LAWYER_MODES.link,
    lawyerId: '1',
    lawyerFullName: '',
    registrationNumber: '',
}

describe('buildUserPatch', () => {
    it('los mismos roles en otro orden no cuentan como cambio', () => {
        expect(buildUserPatch(ORIGINAL, UNCHANGED, ['LAWYER', 'ADMINISTRATOR'])).toEqual({})
    })

    it('al sacar el perfil de abogado, desvincula la ficha con null', () => {
        expect(buildUserPatch(ORIGINAL, UNCHANGED, ['ADMINISTRATOR'])).toEqual({
            roles: ['ADMINISTRATOR'],
            lawyerId: null,
        })
    })
})
