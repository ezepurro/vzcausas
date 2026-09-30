import { describe, expect, it } from 'vitest'
import { isValid, validateUser } from '@/features/users/schemas/user.schema'
import { LAWYER_MODES, type UserFormValues } from '@/features/users/types/user'

/** Un alta válida de una persona de secretaría: no necesita ficha. */
const SECRETARY: UserFormValues = {
    fullName: 'Ana Pérez',
    username: 'aperez',
    email: 'aperez@vazquezzarate.com',
    password: 'inicial2026',
    passwordConfirm: 'inicial2026',
    roleAdministrator: false,
    roleLawyer: false,
    roleSecretary: true,
    lawyerMode: LAWYER_MODES.link,
    lawyerId: '',
    lawyerFullName: '',
    registrationNumber: '',
}

const CREATE = { mode: 'create' as const, roles: ['SECRETARY' as const] }

describe('validateUser', () => {
    it('no devuelve errores con un alta válida', () => {
        expect(validateUser(SECRETARY, CREATE)).toEqual({})
    })

    describe('datos personales', () => {
        it('marca todo lo obligatorio si está vacío', () => {
            const errors = validateUser(
                { ...SECRETARY, fullName: '', username: '', email: '', password: '', passwordConfirm: '' },
                CREATE,
            )
            expect(errors).toEqual({
                fullName: 'El apellido y nombre es obligatorio.',
                username: 'El nombre de usuario es obligatorio.',
                email: 'El correo electrónico es obligatorio.',
                password: 'La contraseña es obligatoria.',
                passwordConfirm: 'Repetí la contraseña.',
            })
        })

        it.each([
            ['muy corto', 'ab', 'Debe tener entre 3 y 30 caracteres.'],
            ['muy largo', 'a'.repeat(31), 'Debe tener entre 3 y 30 caracteres.'],
            ['con espacios', 'ana perez', 'Sólo se admiten letras, números, punto, guión y guión bajo.'],
            ['con arroba', 'ana@perez', 'Sólo se admiten letras, números, punto, guión y guión bajo.'],
        ])('rechaza un usuario %s', (_caso, username, message) => {
            expect(validateUser({ ...SECRETARY, username }, CREATE).username).toBe(message)
        })

        it('acepta punto, guión y guión bajo en el usuario', () => {
            expect(validateUser({ ...SECRETARY, username: 'a.perez-2_x' }, CREATE)).toEqual({})
        })

        it.each(['aperez', 'aperez@', 'aperez@estudio', 'a perez@estudio.com'])(
            'rechaza el correo %s',
            (email) => {
                expect(validateUser({ ...SECRETARY, email }, CREATE).email).toBe(
                    'El formato del correo electrónico no es válido.',
                )
            },
        )
    })

    describe('contraseña (sólo en el alta)', () => {
        it('rechaza menos de 8 caracteres', () => {
            expect(
                validateUser({ ...SECRETARY, password: 'abc1', passwordConfirm: 'abc1' }, CREATE).password,
            ).toBe('Debe tener al menos 8 caracteres.')
        })

        it('rechaza una contraseña sin números', () => {
            expect(
                validateUser({ ...SECRETARY, password: 'sinnumeros', passwordConfirm: 'sinnumeros' }, CREATE)
                    .password,
            ).toBe('Debe incluir al menos un número.')
        })

        it('marca la repetición si no coincide', () => {
            expect(validateUser({ ...SECRETARY, passwordConfirm: 'otra2026' }, CREATE).passwordConfirm).toBe(
                'Las dos contraseñas no coinciden.',
            )
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

    describe('perfiles', () => {
        it('exige al menos un perfil y lo marca en el tilde de secretaría', () => {
            expect(validateUser(SECRETARY, { mode: 'create', roles: [] }).roleSecretary).toBe(
                'Elegí al menos un perfil.',
            )
        })
    })

    describe('ficha profesional', () => {
        const LAWYER = { mode: 'create' as const, roles: ['LAWYER' as const] }

        it('con perfil abogado y modo vincular, exige elegir una ficha', () => {
            expect(validateUser(SECRETARY, LAWYER).lawyerId).toBe(
                'Este perfil necesita una ficha de abogado vinculada.',
            )
        })

        it('con perfil abogado y una ficha elegida, es válido', () => {
            expect(validateUser({ ...SECRETARY, lawyerId: '3' }, LAWYER)).toEqual({})
        })

        it('con modo registrar, exige nombre y matrícula de la ficha nueva', () => {
            const errors = validateUser({ ...SECRETARY, lawyerMode: LAWYER_MODES.create }, LAWYER)
            expect(errors).toEqual({
                lawyerFullName: 'El apellido y nombre del abogado es obligatorio.',
                registrationNumber: 'La matrícula es obligatoria.',
            })
        })

        it('con modo registrar, valida el formato de la matrícula', () => {
            const errors = validateUser(
                {
                    ...SECRETARY,
                    lawyerMode: LAWYER_MODES.create,
                    lawyerFullName: 'Dra. Ana Pérez',
                    registrationNumber: '28114',
                },
                LAWYER,
            )
            expect(errors.registrationNumber).toBe('El formato es circunscripción y número: 1-28114.')
        })

        it('en la edición siempre se vincula una ficha existente, aunque el modo diga registrar', () => {
            const errors = validateUser(
                { ...SECRETARY, lawyerMode: LAWYER_MODES.create },
                { mode: 'edit', roles: ['LAWYER'] },
            )
            expect(errors).toEqual({ lawyerId: 'Este perfil necesita una ficha de abogado vinculada.' })
        })

        it('sólo administrador no necesita ficha', () => {
            expect(validateUser(SECRETARY, { mode: 'create', roles: ['ADMINISTRATOR'] })).toEqual({})
        })
    })
})

describe('isValid', () => {
    it('es true sin errores y false con alguno', () => {
        expect(isValid({})).toBe(true)
        expect(isValid({ email: 'x' })).toBe(false)
    })
})
