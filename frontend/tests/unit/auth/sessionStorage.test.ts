import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    clearStoredSession,
    readStoredSession,
    writeRefreshedSession,
    writeStoredSession,
} from '@/features/auth/utils/sessionStorage'
import { TOKEN_KEY } from '@/shared/api/http'
import type { AuthUser, RefreshedSession, Session } from '@/features/auth/types/session'

const SESSION_KEY = 'vz.session'

const USER: AuthUser = {
    id: 1,
    username: 'fvazquez',
    fullName: 'Fernando G. Vázquez',
    email: 'fvazquez@vazquezzarate.com',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    lawyer: { id: 1, fullName: 'Dr. Fernando G. Vázquez', registrationNumber: '1-28114' },
    lastLoginAt: '2026-09-19T08:12:00-03:00',
    active: true,
}

const SESSION: Session = {
    accessToken: 'token-1',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: USER,
}

function refreshed(overrides: Partial<RefreshedSession['user']> = {}): RefreshedSession {
    return {
        accessToken: 'token-2',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
            id: 1,
            username: 'fvazquez',
            roles: ['ADMINISTRATOR', 'LAWYER'],
            lawyerId: 1,
            permissions: [],
            ...overrides,
        },
    }
}

afterEach(() => {
    vi.useRealTimers()
})

describe('writeStoredSession', () => {
    it('guarda el token pelado bajo la clave que lee http.ts', () => {
        writeStoredSession(SESSION)
        expect(localStorage.getItem(TOKEN_KEY)).toBe('token-1')
    })

    it('resuelve el vencimiento a una fecha concreta', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-09-22T10:00:00Z'))

        const stored = writeStoredSession(SESSION)

        expect(stored.expiresAt).toBe(Date.now() + 3600 * 1000)
        expect(stored.user).toEqual(USER)
    })
})

describe('readStoredSession', () => {
    it('devuelve la sesión que se guardó', () => {
        const written = writeStoredSession(SESSION)
        expect(readStoredSession()).toEqual(written)
    })

    it('devuelve null si no hay nada guardado', () => {
        expect(readStoredSession()).toBeNull()
    })

    it('devuelve null y limpia si falta el token', () => {
        writeStoredSession(SESSION)
        localStorage.removeItem(TOKEN_KEY)

        expect(readStoredSession()).toBeNull()
        expect(localStorage.getItem(SESSION_KEY)).toBeNull()
    })

    it('devuelve null y limpia si la sesión ya venció', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-09-22T10:00:00Z'))
        writeStoredSession(SESSION)

        vi.setSystemTime(new Date('2026-09-22T11:00:01Z'))

        expect(readStoredSession()).toBeNull()
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })

    it('devuelve null si el JSON está corrupto', () => {
        localStorage.setItem(TOKEN_KEY, 'token-1')
        localStorage.setItem(SESSION_KEY, '{esto no es json')

        expect(readStoredSession()).toBeNull()
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })

    it('devuelve null si el usuario guardado no tiene la forma esperada', () => {
        localStorage.setItem(TOKEN_KEY, 'token-1')
        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ user: { ...USER, roles: ['SUPERUSER'] }, expiresAt: Date.now() + 60_000 }),
        )

        expect(readStoredSession()).toBeNull()
    })

    it('devuelve null si falta el vencimiento', () => {
        localStorage.setItem(TOKEN_KEY, 'token-1')
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: USER }))

        expect(readStoredSession()).toBeNull()
    })
})

describe('clearStoredSession', () => {
    it('borra el token y la sesión', () => {
        writeStoredSession(SESSION)
        clearStoredSession()

        expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
        expect(localStorage.getItem(SESSION_KEY)).toBeNull()
    })

    it('se puede llamar sin que haya nada guardado', () => {
        expect(() => clearStoredSession()).not.toThrow()
    })
})

describe('writeRefreshedSession', () => {
    it('guarda el token nuevo y conserva el usuario del login', () => {
        const current = writeStoredSession(SESSION)

        const updated = writeRefreshedSession(current, refreshed())

        expect(updated?.accessToken).toBe('token-2')
        // El usuario de la renovación no trae fullName: tiene que quedar el del login.
        expect(updated?.user).toEqual(USER)
        expect(localStorage.getItem(TOKEN_KEY)).toBe('token-2')
    })

    /* Si un administrador le cambia el perfil a alguien con la sesión
       abierta, el menú y las rutas se tienen que ajustar en la próxima
       renovación, sin esperar a que vuelva a iniciar sesión. */
    it('toma los roles de la renovación y conserva el resto del usuario', () => {
        const current = writeStoredSession(SESSION)

        const updated = writeRefreshedSession(current, refreshed({ roles: ['LAWYER'] }))

        expect(updated?.user.roles).toEqual(['LAWYER'])
        expect(updated?.user.fullName).toBe(USER.fullName)
        expect(updated?.user.email).toBe(USER.email)
        // Y sobrevive a una recarga con los roles nuevos.
        expect(readStoredSession()?.user.roles).toEqual(['LAWYER'])
    })

    it('si el token renovado es de otra persona, descarta todo', () => {
        const current = writeStoredSession(SESSION)

        expect(writeRefreshedSession(current, refreshed({ id: 99 }))).toBeNull()
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
        expect(readStoredSession()).toBeNull()
    })
})
