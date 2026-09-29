import { describe, expect, it } from 'vitest'
import { buildUserPatch, hasChanges } from '@/features/users/utils/buildUserPatch'
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
    it('sin cambios devuelve un parche vacío', () => {
        const patch = buildUserPatch(ORIGINAL, UNCHANGED, ['ADMINISTRATOR', 'LAWYER'])
        expect(patch).toEqual({})
        expect(hasChanges(patch)).toBe(false)
    })

    it('agregar espacios no cuenta como cambio', () => {
        expect(
            buildUserPatch(ORIGINAL, { ...UNCHANGED, username: ' fvazquez ' }, ['ADMINISTRATOR', 'LAWYER']),
        ).toEqual({})
    })

    it('manda sólo los campos que cambiaron, recortados', () => {
        expect(
            buildUserPatch(ORIGINAL, { ...UNCHANGED, email: ' nuevo@vazquezzarate.com ' }, [
                'ADMINISTRATOR',
                'LAWYER',
            ]),
        ).toEqual({ email: 'nuevo@vazquezzarate.com' })
    })

    it('los mismos roles en otro orden no cuentan como cambio', () => {
        expect(buildUserPatch(ORIGINAL, UNCHANGED, ['LAWYER', 'ADMINISTRATOR'])).toEqual({})
    })

    it('si cambian los roles, manda el conjunto completo', () => {
        expect(buildUserPatch(ORIGINAL, UNCHANGED, ['LAWYER']).roles).toEqual(['LAWYER'])
    })

    it('al sacar el perfil de abogado, desvincula la ficha con null', () => {
        expect(buildUserPatch(ORIGINAL, UNCHANGED, ['ADMINISTRATOR'])).toEqual({
            roles: ['ADMINISTRATOR'],
            lawyerId: null,
        })
    })

    it('al cambiar de ficha manda el id nuevo como número', () => {
        expect(
            buildUserPatch(ORIGINAL, { ...UNCHANGED, lawyerId: '2' }, ['ADMINISTRATOR', 'LAWYER']),
        ).toEqual({ lawyerId: 2 })
    })

    it('a una secretaria sin ficha no le manda lawyerId', () => {
        const secretary: User = { ...ORIGINAL, roles: ['SECRETARY'], lawyer: null }
        expect(
            buildUserPatch(secretary, { ...UNCHANGED, lawyerId: '' }, ['SECRETARY']),
        ).not.toHaveProperty('lawyerId')
    })
})

describe('hasChanges', () => {
    it('es true si hay algún campo', () => {
        expect(hasChanges({ fullName: 'x' })).toBe(true)
    })
})
