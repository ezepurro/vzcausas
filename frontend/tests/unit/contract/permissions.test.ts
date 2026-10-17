import { describe, expect, it } from 'vitest'
import { resolveRequest } from '@/shared/mocks'

/**
 * Permisos del servidor falso, según la matriz por perfil del contrato
 * (V4 §4: la del 11/10/2026, D-39, más lo que suma el Sprint 3).
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
    // V4: la carpeta de la causa (HU39, HU40) y la línea de vida con sus listados (HU27, D-85).
    ['POST', `/cases/${MISSING}/folder`],
    ['GET', `/cases/${MISSING}/interruptive-acts`],
    ['GET', `/cases/${MISSING}/procedural-acts`],
    ['GET', `/cases/${MISSING}/procedural-acts/1`],
    ['GET', `/cases/${MISSING}/timeline`],
]

/** Lo que sigue siendo sólo del Administrador. */
const ADMINISTRATOR_ONLY: readonly [Method, string][] = [
    ['GET', '/users'],
    ['POST', '/users'],
    ['POST', '/lawyers'],
    ['PATCH', `/lawyers/${MISSING}`],
    ['DELETE', `/lawyers/${MISSING}`],
    // V4: el tablero "Estudio" (HU42).
    ['GET', '/dashboards/administrator'],
]

/**
 * "`ADMINISTRATOR` o `LAWYER`" (V4 §4): la primera lectura que la Secretaría
 * no tiene. Modelos formales y la marca de prescripción.
 */
const ADMINISTRATOR_OR_LAWYER: readonly [Method, string][] = [
    ['POST', '/document-templates'],
    ['GET', '/document-templates'],
    ['GET', `/document-templates/${MISSING}`],
    ['GET', `/document-templates/${MISSING}/file`],
    ['POST', `/cases/${MISSING}/prescription`],
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

    describe.each(ADMINISTRATOR_OR_LAWYER)('%s %s es del Administrador o del Abogado', (method, path) => {
        it.each(['ADMINISTRATOR', 'LAWYER'] as const)('%s no recibe 403', (profile) => {
            expect(statusFor(profile, method, path)).not.toBe(403)
        })

        it('SECRETARY recibe 403', () => {
            expect(statusFor('SECRETARY', method, path)).toBe(403)
        })
    })

    /* "Mi día" es el tablero del abogado (V4 §3.11, HU41): un administrador
       que no ejerce no lo tiene. */
    describe('GET /dashboards/lawyer es sólo del Abogado', () => {
        it('LAWYER no recibe 403', () => {
            expect(statusFor('LAWYER', 'GET', '/dashboards/lawyer')).not.toBe(403)
        })

        it.each(['ADMINISTRATOR', 'SECRETARY'] as const)('%s recibe 403', (profile) => {
            expect(statusFor(profile, 'GET', '/dashboards/lawyer')).toBe(403)
        })
    })
})
