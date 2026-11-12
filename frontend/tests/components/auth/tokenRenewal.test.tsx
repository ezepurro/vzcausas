/**
 * La renovación silenciosa del token de acceso.
 *
 * `http.ts` la describe como "lo más delicado del frontend" y hasta ahora no
 * la ejercía ningún test: el único E2E que tocaba tokens revocaba las sesiones
 * junto con vencerlas, así que garantizaba que la renovación **fallara** y
 * nunca probaba el camino feliz. Ese agujero es el que dejó pasar que
 * `POST /auth/refresh` no estuviera en los handlers de MSW.
 *
 * La pieza bajo prueba es la conversación entre tres archivos que no se
 * importan entre sí:
 *
 * - `http.ts` decide **cuándo** renovar y serializa las renovaciones,
 * - `AuthProvider` registra el **cómo** al montarse (`setRenewHandler`),
 * - `sessionStorage.ts` es el único que escribe el token.
 *
 * Por eso los tests montan `AuthProvider` —vía `renderWithProviders`— aunque
 * lo que se mire después sea el resultado de un pedido y no la pantalla: sin
 * el proveedor montado, `http.ts` no tiene a quién pedirle la renovación y
 * todo termina en un cierre de sesión.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { server } from '@/shared/mocks/server'
import { db, expireIssuedTokens, issueToken } from '@/shared/mocks'
import { http, TOKEN_KEY } from '@/shared/api/http'
import {
    isAccessTokenExpired,
    readStoredSession,
    writeStoredSession,
} from '@/features/auth/utils/sessionStorage'
import { renderWithProviders, signInAs } from '../../setup/render'

/**
 * Vence el token **también del lado del cliente**: el `expiresAt` guardado
 * queda en el pasado. Es lo que pasa en la realidad a los quince minutos, y
 * lo que `expireIssuedTokens()` solo no reproduce —con el `expiresAt` todavía
 * vigente, el test de abajo pasaba aunque en el navegador la sesión se
 * cerrara—.
 */
function expireEverywhere() {
    expireIssuedTokens()
    const raw = localStorage.getItem('vz.session')
    if (raw === null) throw new Error('No hay sesión guardada que vencer')
    localStorage.setItem('vz.session', JSON.stringify({ ...JSON.parse(raw), expiresAt: Date.now() - 1000 }))
}

/** Cuenta los `POST /auth/refresh` mientras corre `body`. */
async function countRenewals(body: () => Promise<void>): Promise<number> {
    let renewals = 0
    const count = ({ request }: { request: Request }) => {
        if (request.url.includes('/auth/refresh')) renewals += 1
    }
    server.events.on('request:start', count)
    try {
        await body()
    } finally {
        server.events.removeListener('request:start', count)
    }
    return renewals
}

/** Instala un `navigator.locks` de mentira; `beforeTask` corre al conseguir el lock. */
function stubLocks(beforeTask: () => void = () => {}) {
    const request = vi.fn(async (_name: string, task: () => Promise<unknown>) => {
        beforeTask()
        return task()
    })
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })
    return request
}

afterEach(() => {
    // jsdom no trae `navigator.locks`: se saca el de mentira si un test lo puso.
    Reflect.deleteProperty(navigator, 'locks')
})

/**
 * Monta los proveedores sólo para que `AuthProvider` registre sus handlers en
 * `http.ts`. Lo que se renderiza adentro no importa: los pedidos se disparan
 * a mano para no depender de qué pantalla pide qué.
 *
 * Espera a que se vea, porque al montarse `AuthProvider` ya renueva una vez
 * para traer los roles del servidor (ver `sessionSync.test.tsx`). Estos tests
 * miran lo que pasa después.
 */
async function mountSession(as = 'fvazquez') {
    renderWithProviders(<p>Sesión abierta</p>, { as })
    await screen.findByText('Sesión abierta')
    return { token: () => localStorage.getItem(TOKEN_KEY) }
}

describe('renovación del token', () => {
    it('un token vencido se renueva solo y el pedido se reintenta', async () => {
        const session = await mountSession()
        const before = session.token()

        // El reloj del mock es manual: esto vence los tokens emitidos sin
        // tocar las sesiones, que es el caso real de "se te venció el access
        // token pero la cookie de renovación sigue viva".
        expireIssuedTokens()

        const response = await http.get('/users')

        expect(response.status).toBe(200)
        expect(session.token()).not.toBe(before)
    })

    it('si la renovación tampoco se puede, cierra la sesión', async () => {
        await mountSession()

        // Vencidos *y* revocados: es lo que hace el backend cuando da la
        // sesión por terminada. `userForRenewal` acepta un token vencido pero
        // no uno revocado, así que el refresh responde 401.
        expireIssuedTokens()
        db.sessions.clear()

        await expect(http.get('/users')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })

    it('varios pedidos vencidos a la vez renuevan una sola vez', async () => {
        /* No es un detalle de eficiencia: el backend rota el token de
           renovación en cada uso y, si le llega uno ya usado, da por robada la
           sesión y la cierra entera. Renovar de a tres sería echarse solo.

           Se cuenta con el bus de eventos de MSW y no pisando el handler con
           `server.use`, así lo que responde el mock sigue siendo lo mismo que
           en los otros tests. */
        await mountSession()

        let renewals = 0
        const count = ({ request }: { request: Request }) => {
            if (request.url.includes('/auth/refresh')) renewals += 1
        }
        server.events.on('request:start', count)

        try {
            expireIssuedTokens()

            const responses = await Promise.all([
                http.get('/users'),
                http.get('/lawyers'),
                http.get('/procedural-states'),
            ])

            expect(responses.map((r) => r.status)).toEqual([200, 200, 200])
            expect(renewals).toBe(1)
        } finally {
            server.events.removeListener('request:start', count)
        }
    })

    it('con el token vencido también en el cliente, renueva igual y no cierra la sesión', async () => {
        /* El caso real a los quince minutos. Antes `readStoredSession`
           descartaba la sesión por vencida, la renovación no tenía sobre qué
           trabajar y la persona terminaba en el login. */
        const session = await mountSession()
        const before = session.token()
        expireEverywhere()

        const response = await http.get('/users')

        expect(response.status).toBe(200)
        expect(session.token()).not.toBe(before)
        const stored = readStoredSession()
        expect(stored).not.toBeNull()
        expect(stored && isAccessTokenExpired(stored)).toBe(false)
    })

    it('al abrir la aplicación con el token vencido, lo renueva en vez de mandar al login', async () => {
        signInAs('fvazquez')
        const before = localStorage.getItem(TOKEN_KEY)
        expireEverywhere()

        renderWithProviders(<p>Sesión abierta</p>)
        await screen.findByText('Sesión abierta')

        const stored = readStoredSession()
        expect(stored?.user.username).toBe('fvazquez')
        expect(stored?.accessToken).not.toBe(before)
        expect(stored && isAccessTokenExpired(stored)).toBe(false)
    })

    it('renueva adentro del lock compartido entre pestañas', async () => {
        await mountSession()
        const request = stubLocks()
        expireEverywhere()

        const renewals = await countRenewals(async () => {
            await http.get('/users')
        })

        expect(request).toHaveBeenCalledWith('vz.auth.refresh', expect.any(Function))
        expect(renewals).toBe(1)
    })

    it('si otra pestaña ya renovó mientras esperaba el lock, usa ese token y no llama al backend', async () => {
        /* La cookie de esta pestaña ya fue rotada por la otra: presentarla de
           nuevo haría que el backend revoque la sesión entera. */
        await mountSession()
        expireEverywhere()

        let otherTabToken: string | null = null
        stubLocks(() => {
            const current = readStoredSession()
            if (current === null) throw new Error('Sin sesión')
            otherTabToken = issueToken(current.user.id)
            writeStoredSession({ accessToken: otherTabToken, tokenType: 'Bearer', expiresIn: 900, user: current.user })
        })

        let status = 0
        const renewals = await countRenewals(async () => {
            status = (await http.get('/users')).status
        })

        expect(status).toBe(200)
        expect(renewals).toBe(0)
        expect(localStorage.getItem(TOKEN_KEY)).toBe(otherTabToken)
    })

    it('si otra pestaña no pudo renovar y borró la sesión, cierra la sesión sin llamar al backend', async () => {
        await mountSession()
        expireEverywhere()
        stubLocks(() => localStorage.clear())

        let failure: unknown = null
        const renewals = await countRenewals(async () => {
            failure = await http.get('/users').catch((error: unknown) => error)
        })

        expect(failure).toMatchObject({ code: 'UNAUTHENTICATED' })
        expect(renewals).toBe(0)
        expect(readStoredSession()).toBeNull()
    })
})
