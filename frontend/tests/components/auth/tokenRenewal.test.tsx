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

import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { server } from '@/shared/mocks/server'
import { db, expireIssuedTokens } from '@/shared/mocks'
import { http, TOKEN_KEY } from '@/shared/api/http'
import { renderWithProviders } from '../../setup/render'

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
})
