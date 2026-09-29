import { describe, expect, it } from 'vitest'
import { toCreateUserBody } from '@/features/users/utils/toCreateUserBody'
import { LAWYER_MODES, type UserFormValues } from '@/features/users/types/user'

const VALUES: UserFormValues = {
    fullName: '  Ana Pérez ',
    username: ' aperez ',
    email: ' aperez@vazquezzarate.com ',
    password: ' clave2026 ',
    passwordConfirm: ' clave2026 ',
    roleAdministrator: false,
    roleLawyer: true,
    roleSecretary: false,
    lawyerMode: LAWYER_MODES.link,
    lawyerId: '3',
    lawyerFullName: '',
    registrationNumber: '',
}

describe('toCreateUserBody', () => {
    it('recorta los datos personales pero no la contraseña', () => {
        const body = toCreateUserBody(VALUES, ['LAWYER'])
        expect(body).toMatchObject({
            username: 'aperez',
            fullName: 'Ana Pérez',
            email: 'aperez@vazquezzarate.com',
            password: ' clave2026 ',
            roles: ['LAWYER'],
        })
    })

    it('nunca manda la repetición de la contraseña', () => {
        expect(toCreateUserBody(VALUES, ['LAWYER'])).not.toHaveProperty('passwordConfirm')
    })

    it('al vincular una ficha manda lawyerId como número', () => {
        const body = toCreateUserBody(VALUES, ['LAWYER'])
        expect(body.lawyerId).toBe(3)
        expect(body).not.toHaveProperty('lawyer')
    })

    it('al registrar una ficha nueva manda lawyer y no lawyerId', () => {
        const body = toCreateUserBody(
            {
                ...VALUES,
                lawyerMode: LAWYER_MODES.create,
                lawyerFullName: ' Dra. Ana Pérez ',
                registrationNumber: ' 1-50000 ',
            },
            ['LAWYER'],
        )
        expect(body.lawyer).toEqual({ fullName: 'Dra. Ana Pérez', registrationNumber: '1-50000' })
        expect(body).not.toHaveProperty('lawyerId')
    })

    it('con perfil secretaría no manda ninguna ficha', () => {
        const body = toCreateUserBody(VALUES, ['SECRETARY'])
        expect(body).not.toHaveProperty('lawyerId')
        expect(body).not.toHaveProperty('lawyer')
    })

    it('manda todos los roles tildados', () => {
        expect(toCreateUserBody(VALUES, ['ADMINISTRATOR', 'LAWYER']).roles).toEqual([
            'ADMINISTRATOR',
            'LAWYER',
        ])
    })
})
