import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    readStoredSession,
    writeRefreshedSession,
    writeStoredSession } from '@/features/auth/utils/sessionStorage'
import { TOKEN_KEY } from '@/shared/api/http'
import type { AuthUser, RefreshedSession, Session } from '@/features/auth/types/session'

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
})
