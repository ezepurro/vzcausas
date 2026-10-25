import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    readStoredSession,
    writeRefreshedSession,
    writeStoredSession,
    writeStoredUser } from '@/features/auth/utils/sessionStorage'
import { TOKEN_KEY } from '@/shared/api/http'
import type { AuthUser, RefreshedSession, Session } from '@/features/auth/types/session'

const USER: AuthUser = {
    id: 1,
    username: 'fvazquez',
    lastName: 'Vázquez',
    firstName: 'Fernando G.',
    email: 'fvazquez@vazquezzarate.com',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    lawyer: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.', registrationNumber: '1-28114' },
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

describe('readStoredSession', () => {
    it('devuelve null y limpia si la sesión ya venció', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-09-22T10:00:00Z'))
        writeStoredSession(SESSION)

        vi.setSystemTime(new Date('2026-09-22T11:00:01Z'))

        expect(readStoredSession()).toBeNull()
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })
})

describe('writeRefreshedSession', () => {
    it('si el token renovado es de otra persona, descarta todo', () => {
        const current = writeStoredSession(SESSION)

        expect(writeRefreshedSession(current, refreshed({ id: 99 }))).toBeNull()
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
        expect(readStoredSession()).toBeNull()
    })

    it('toma los roles renovados y conserva el resto del usuario del login', () => {
        const current = writeStoredSession(SESSION)

        const updated = writeRefreshedSession(current, refreshed({ roles: ['LAWYER'] }))

        expect(updated?.user).toEqual({ ...USER, roles: ['LAWYER'] })
        expect(readStoredSession()?.user.roles).toEqual(['LAWYER'])
        expect(localStorage.getItem(TOKEN_KEY)).toBe('token-2')
    })

    it('si le sacaron la ficha, la sesión queda sin ficha', () => {
        const current = writeStoredSession(SESSION)

        const updated = writeRefreshedSession(current, refreshed({ roles: ['ADMINISTRATOR'], lawyerId: null }))

        expect(updated?.user.lawyer).toBeNull()
    })

    it('si le vincularon otra ficha, no conserva la vieja: queda sin ficha hasta completarla', () => {
        /* La renovación trae sólo el id. Conservar la ficha vieja sería dar
           por responsable de sus causas a quien ya no lo es. */
        const current = writeStoredSession(SESSION)

        const updated = writeRefreshedSession(current, refreshed({ lawyerId: 9 }))

        expect(updated?.user.lawyer).toBeNull()
    })
})

describe('writeStoredUser', () => {
    it('reemplaza el usuario y conserva el token y su vencimiento', () => {
        const current = writeStoredSession(SESSION)
        const lawyer = { id: 9, lastName: 'Paz', firstName: 'Lucía', registrationNumber: '1-40000' }

        const updated = writeStoredUser(current, { ...USER, roles: ['LAWYER'], lawyer })

        expect(updated).toEqual({ ...current, user: { ...USER, roles: ['LAWYER'], lawyer } })
        expect(readStoredSession()).toEqual(updated)
    })
})
