import { describe, expect, it } from 'vitest'
import { validateUser } from '@/features/users/schemas/user.schema'
import { LAWYER_MODES, type UserFormValues } from '@/features/users/types/user'

/** Un alta válida de una persona de secretaría: no necesita ficha. */
const SECRETARY: UserFormValues = {
    lastName: 'Pérez',
    firstName: 'Ana',
    username: 'aperez',
    email: 'aperez@vazquezzarate.com',
    password: 'inicial2026',
    passwordConfirm: 'inicial2026',
    roleAdministrator: false,
    roleLawyer: false,
    roleSecretary: true,
    lawyerMode: LAWYER_MODES.link,
    lawyerId: '',
    registrationNumber: '',
}

const CREATE = { mode: 'create' as const, roles: ['SECRETARY' as const] }

describe('validateUser', () => {
    describe('datos personales', () => {
        it.each([
            ['con espacios', 'ana perez', 'Sólo se admiten letras, números, punto, guión y guión bajo.'],
        ])('rechaza un usuario %s', (_caso, username, message) => {
            expect(validateUser({ ...SECRETARY, username }, CREATE).username).toBe(message)
        })

        it.each(['aperez@estudio'])(
            'rechaza el correo %s',
            (email) => {
                expect(validateUser({ ...SECRETARY, email }, CREATE).email).toBe(
                    'El formato del correo electrónico no es válido.',
                )
            },
        )
    })

    describe('contraseña (sólo en el alta)', () => {
        it('rechaza una contraseña sin números', () => {
            expect(
                validateUser({ ...SECRETARY, password: 'sinnumeros', passwordConfirm: 'sinnumeros' }, CREATE)
                    .password,
            ).toBe('Debe incluir al menos un número.')
        })

        it('en la edición no pide contraseña', () => {
            expect(
                validateUser(
                    { ...SECRETARY, password: '', passwordConfirm: '' },
                    { mode: 'edit', roles: ['SECRETARY'] },
                ),
            ).toEqual({})
        })
    })

    describe('ficha profesional', () => {
        const LAWYER = { mode: 'create' as const, roles: ['LAWYER' as const] }

        it('con perfil abogado y modo vincular, exige elegir una ficha', () => {
            expect(validateUser(SECRETARY, LAWYER).lawyerId).toBe(
                'Este perfil necesita una ficha de abogado vinculada.',
            )
        })

        it('con modo registrar, la matrícula de la ficha nueva es opcional', () => {
            // El apellido y los nombres de la ficha son los del usuario (TESTING.md §11).
            const errors = validateUser({ ...SECRETARY, lawyerMode: LAWYER_MODES.create }, LAWYER)
            expect(errors).toEqual({})
        })

        it('con modo registrar, valida el formato de la matrícula si viene', () => {
            const errors = validateUser(
                { ...SECRETARY, lawyerMode: LAWYER_MODES.create, registrationNumber: '28114' },
                LAWYER,
            )
            expect(errors).toEqual({
                registrationNumber: 'El formato es circunscripción y número: 1-28114.',
            })
        })
    })
})
