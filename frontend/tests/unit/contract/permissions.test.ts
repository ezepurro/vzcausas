import { describe, expect, it } from 'vitest'
import { resetMockDb, resolveRequest } from '@/shared/mocks'

/**
 * Permisos del servidor falso, según la matriz por perfil del contrato
 * (V5 §4: la del 11/10/2026, D-39, más lo que suman los Sprints 3 y 4).
 *
 * Lo que no depende del rol sino de la causa o del documento no está acá:
 * modificar un acto lo hace el responsable actual (D-30), y descargar un
 * documento que no es un expediente, `LAWYER` o `SECRETARY` (D-103). Los
 * prueban las pantallas.
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
    // V5: modificar y dar de baja la causa, la carátula, sus documentos y el expediente (HU19 a HU25, HU38).
    // Por rol los tres pasan; modificar, dar de baja y la carpeta además dependen de la causa (D-110, abajo).
    ['PATCH', `/cases/${MISSING}`],
    ['DELETE', `/cases/${MISSING}`],
    ['GET', `/cases/${MISSING}/cover`],
    ['GET', `/cases/${MISSING}/documents`],
    ['POST', `/cases/${MISSING}/case-files`],
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

/**
 * Para cada endpoint del grupo y cada perfil, si el servidor le responde `403`.
 * Se compara el mapa entero de una vez: si algo no coincide, el diff dice qué
 * endpoint y qué perfil, y el grupo sigue siendo un solo test (TESTING.md §4).
 */
function forbiddenMap(endpoints: readonly [Method, string][]): Record<string, boolean> {
    const map: Record<string, boolean> = {}
    for (const [method, path] of endpoints) {
        for (const profile of PROFILES) {
            map[`${method} ${path} · ${profile}`] = statusFor(profile, method, path) === 403
        }
    }
    return map
}

/** Lo que tendría que dar `forbiddenMap` si sólo `allowed` puede operar. */
function expectedMap(endpoints: readonly [Method, string][], allowed: readonly Profile[]): Record<string, boolean> {
    const map: Record<string, boolean> = {}
    for (const [method, path] of endpoints) {
        for (const profile of PROFILES) {
            map[`${method} ${path} · ${profile}`] = !allowed.includes(profile)
        }
    }
    return map
}

/* "Mi día" es el tablero del abogado (V4 §3.11, HU41): un administrador que
   no ejerce no lo tiene. */
const LAWYER_ONLY: readonly [Method, string][] = [['GET', '/dashboards/lawyer']]

describe('permisos del servidor falso', () => {
    it('lo que la matriz abre a todos lo opera cualquier perfil', () => {
        expect(forbiddenMap(OPEN_TO_EVERYONE)).toEqual(expectedMap(OPEN_TO_EVERYONE, PROFILES))
    })

    it('lo que es sólo del Administrador rechaza al Abogado y a la Secretaría', () => {
        expect(forbiddenMap(ADMINISTRATOR_ONLY)).toEqual(expectedMap(ADMINISTRATOR_ONLY, ['ADMINISTRATOR']))
    })

    it('lo que es del Administrador o del Abogado rechaza a la Secretaría', () => {
        expect(forbiddenMap(ADMINISTRATOR_OR_LAWYER)).toEqual(
            expectedMap(ADMINISTRATOR_OR_LAWYER, ['ADMINISTRATOR', 'LAWYER']),
        )
    })

    it('el tablero "Mi día" es sólo del Abogado', () => {
        expect(forbiddenMap(LAWYER_ONLY)).toEqual(expectedMap(LAWYER_ONLY, ['LAWYER']))
    })
})

/**
 * Operación de la causa (V5 §4, D-110): además del rol, depende de quién
 * la lleva. La causa 4 la lleva `fvazquez`; `mrios` sólo es abogado y no es
 * el responsable. Acá el `404` va antes que el `403` (sin causa no hay
 * responsable), así que se prueba con una causa que existe. Cada pedido va
 * con un estado de la base nuevo, para que una baja no tape lo que sigue.
 */
describe('operación de la causa en el servidor falso (D-110)', () => {
    const CASE = 4
    /** Un cuerpo válido de "Marcar prescripta": con `{}` el `400` saldría antes. */
    const PRESCRIPTION = { prescriptionDate: '2026-09-01', resolution: 'Sentencia N° 1' }

    function statusOn(username: string, password: string, method: Method, path: string, body?: unknown): number {
        resetMockDb()
        const login = resolveRequest({
            method: 'POST',
            path: '/auth/login',
            query: new URLSearchParams(),
            body: { username, password },
        })
        const token = (login.body as { data: { accessToken: string } }).data.accessToken
        return resolveRequest({ method, path, query: new URLSearchParams(), body, token }).status
    }

    const OPERATIONS: readonly [Method, string, unknown][] = [
        ['PATCH', `/cases/${CASE}`, { court: 'Otro órgano' }],
        ['DELETE', `/cases/${CASE}`, undefined],
        ['POST', `/cases/${CASE}/folder`, {}],
    ]

    it('un abogado que no es el responsable recibe 403; el responsable, el Administrador y la Secretaría, no', () => {
        const forbidden = (username: string, password: string) =>
            OPERATIONS.map(([method, path, body]) => statusOn(username, password, method, path, body) === 403)

        expect(forbidden('mrios', 'abogado123')).toEqual([true, true, true])
        expect(forbidden('fvazquez', 'password1')).toEqual([false, false, false])
        expect(forbidden(USERS.ADMINISTRATOR.username, USERS.ADMINISTRATOR.password)).toEqual([false, false, false])
        expect(forbidden(USERS.SECRETARY.username, USERS.SECRETARY.password)).toEqual([false, false, false])
    })

    it('"Marcar prescripta" es del responsable o del Administrador', () => {
        const path = `/cases/${CASE}/prescription`
        expect(statusOn('mrios', 'abogado123', 'POST', path, PRESCRIPTION)).toBe(403)
        expect(statusOn('fvazquez', 'password1', 'POST', path, PRESCRIPTION)).toBe(200)
        expect(statusOn(USERS.ADMINISTRATOR.username, USERS.ADMINISTRATOR.password, 'POST', path, PRESCRIPTION)).toBe(200)
        expect(statusOn(USERS.SECRETARY.username, USERS.SECRETARY.password, 'POST', path, PRESCRIPTION)).toBe(403)
    })

    it('un PATCH con clientId responde 400 en el campo (D-111)', () => {
        resetMockDb()
        const login = resolveRequest({
            method: 'POST',
            path: '/auth/login',
            query: new URLSearchParams(),
            body: USERS.SECRETARY,
        })
        const token = (login.body as { data: { accessToken: string } }).data.accessToken
        const response = resolveRequest({
            method: 'PATCH',
            path: `/cases/${CASE}`,
            query: new URLSearchParams(),
            body: { clientId: 2 },
            token,
        })
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
            error: { details: { clientId: 'El cliente de una causa no se puede modificar.' } },
        })
    })
})
