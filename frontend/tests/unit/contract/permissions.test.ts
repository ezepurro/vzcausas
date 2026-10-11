import { describe, expect, it } from 'vitest'
import { resolveRequest } from '@/shared/mocks'

/**
 * Permisos del servidor falso, según la matriz por perfil del contrato
 * (V3 §4, revisión del 11/10/2026, D-39).
 *
 * El mock valida en este orden: 401 → 403 → 400 → 404. Por eso alcanza con
 * mandar un cuerpo vacío o un id que no existe: si el perfil no puede, responde
 * `403`; si puede, llega más lejos y responde otra cosa (`400` o `404`).
 */

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

/** Un usuario semilla por perfil, sin roles combinados. */
const USERS = {
    ADMINISTRATOR: { username: 'supervision', password: 'password1' },
    LAWYER: { username: 'mrios', password: 'abogado123' },
    SECRETARY: { username: 'gestion', password: 'secre123' },
} as const

type Profile = keyof typeof USERS

const PROFILES = Object.keys(USERS) as Profile[]

/** Un id que ninguna semilla usa: el pedido pasa la autorización y termina en 404. */
const MISSING = 99999

function login(profile: Profile): string {
    const response = resolveRequest({
        method: 'POST',
        path: '/auth/login',
        query: new URLSearchParams(),
        body: USERS[profile],
    })
    expect(response.status).toBe(200)
    return (response.body as { data: { accessToken: string } }).data.accessToken
}

function statusFor(profile: Profile, method: Method, path: string): number {
    return resolveRequest({
        method,
        path,
        query: new URLSearchParams(),
        body: method === 'GET' || method === 'DELETE' ? undefined : {},
        token: login(profile),
    }).status
}

/** Lo que la matriz abre a los tres perfiles. */
const OPEN_TO_EVERYONE: readonly [Method, string][] = [
    ['POST', '/clients'],
    ['POST', '/procedural-states'],
    ['PATCH', `/procedural-states/${MISSING}`],
    ['DELETE', `/procedural-states/${MISSING}`],
    ['POST', '/legal-qualifications'],
    ['PATCH', `/legal-qualifications/${MISSING}`],
    ['DELETE', `/legal-qualifications/${MISSING}`],
]

/** Lo que sigue siendo sólo del Administrador. */
const ADMINISTRATOR_ONLY: readonly [Method, string][] = [
    ['GET', '/users'],
    ['POST', '/users'],
    ['POST', '/lawyers'],
    ['PATCH', `/lawyers/${MISSING}`],
    ['DELETE', `/lawyers/${MISSING}`],
]

describe('permisos del servidor falso', () => {
    describe.each(OPEN_TO_EVERYONE)('%s %s lo opera cualquier perfil', (method, path) => {
        it.each(PROFILES)('%s no recibe 403', (profile) => {
            expect(statusFor(profile, method, path)).not.toBe(403)
        })
    })

    describe.each(ADMINISTRATOR_ONLY)('%s %s es sólo del Administrador', (method, path) => {
        it('ADMINISTRATOR no recibe 403', () => {
            expect(statusFor('ADMINISTRATOR', method, path)).not.toBe(403)
        })

        it.each(['LAWYER', 'SECRETARY'] as const)('%s recibe 403', (profile) => {
            expect(statusFor(profile, method, path)).toBe(403)
        })
    })
})
