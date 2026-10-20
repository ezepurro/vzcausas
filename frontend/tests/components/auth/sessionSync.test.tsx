/**
 * Los roles y la ficha de la sesión, al día con el servidor.
 *
 * Los roles se guardan en el login y, hasta ahora, sólo se actualizaban
 * cuando el token vencía (cada 15 minutos). Si a alguien le cambiaban los
 * roles, un F5 no alcanzaba: seguía viendo las pantallas del perfil viejo.
 * El backend no tenía ese problema —lee los permisos de la base en cada
 * pedido—; el que se quedaba atrás era el front.
 *
 * Ahora, al abrir la aplicación con una sesión guardada, `AuthProvider`
 * renueva una vez (`POST /auth/refresh`, V4 §3.1), que trae los roles y el
 * `lawyerId` actuales, y recién después muestra las pantallas. Si la ficha
 * cambió, la completa con `GET /lawyers/{lawyerId}`.
 */

import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/shared/mocks/server'
import { db } from '@/shared/mocks'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { RequireSession } from '@/app/router/RequireSession'
import { RequireAccess } from '@/app/router/RequireAccess'
import { http as api } from '@/shared/api/http'
import { renderWithProviders, signInAs, waitForSession } from '../../setup/render'

/** Muestra lo que la sesión dice del usuario. */
function Probe() {
    const user = useCurrentUser()
    const lawyer = user.lawyer ? `${user.lawyer.id} ${user.lawyer.lastName}` : 'ninguna'
    return <p>Roles: {user.roles.join(', ')} · Ficha: {lawyer}</p>
}

function storedUser(username: string) {
    const found = db.users.find((u) => u.username === username)
    if (!found) throw new Error(`No existe el usuario ${username} en el mock.`)
    return found
}

/** Cuenta los pedidos a `/auth/refresh` mientras corre `body`. */
async function countingRenewals(body: () => Promise<void>): Promise<number> {
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

describe('sesión al abrir la aplicación', () => {
    it('toma los roles actuales del servidor, no los del login', async () => {
        signInAs('fvazquez') // Administrador y Abogado al iniciar sesión
        storedUser('fvazquez').roles = ['LAWYER']

        renderWithProviders(<Probe />)

        expect(await screen.findByText(/^Roles: LAWYER ·/)).toBeInTheDocument()
    })

    it('mientras lo verifica no muestra la pantalla del perfil viejo', async () => {
        signInAs('fvazquez')
        storedUser('fvazquez').roles = ['LAWYER']

        renderWithProviders(<Probe />)

        expect(screen.getByText(/verificando la sesión/i)).toBeInTheDocument()
        expect(screen.queryByText(/^Roles:/)).not.toBeInTheDocument()
        await screen.findByText(/^Roles: LAWYER ·/)
    })

    it('si le vincularon otra ficha de abogado, trae la nueva', async () => {
        signInAs('fvazquez')
        const other = db.lawyers.find((l) => l.id === 9)
        if (!other) throw new Error('Falta el abogado 9 en las semillas.')
        storedUser('fvazquez').lawyerId = 9

        renderWithProviders(<Probe />)

        expect(await screen.findByText(`Roles: ADMINISTRATOR, LAWYER · Ficha: 9 ${other.lastName}`)).toBeInTheDocument()
    })

    it('si le sacaron la ficha, la sesión queda sin ficha', async () => {
        signInAs('fvazquez')
        storedUser('fvazquez').roles = ['ADMINISTRATOR']
        storedUser('fvazquez').lawyerId = null

        renderWithProviders(<Probe />)

        expect(await screen.findByText('Roles: ADMINISTRATOR · Ficha: ninguna')).toBeInTheDocument()
    })

    it('si el servidor ya no reconoce la sesión, manda al login', async () => {
        signInAs('fvazquez')
        db.sessions.clear()

        renderWithProviders(<RequireSession />, {
            route: '/inicio',
            children: [{ path: '/inicio', element: <Probe /> }],
            routes: [{ path: '/login', element: <p>Pantalla de login</p> }],
        })

        expect(await screen.findByText('Pantalla de login')).toBeInTheDocument()
        expect(screen.queryByText(/^Roles:/)).not.toBeInTheDocument()
    })

    it('si el servidor no responde, sigue con la sesión guardada', async () => {
        /* Sin red no se sabe nada nuevo de los roles, pero tampoco que la
           sesión haya terminado: echar a la persona por un corte sería peor.
           El backend sigue autorizando cada pedido con los roles reales. */
        signInAs('fvazquez')
        server.use(http.post('*/auth/refresh', () => HttpResponse.error()))

        renderWithProviders(<Probe />)

        expect(await screen.findByText(/^Roles: ADMINISTRATOR, LAWYER ·/)).toBeInTheDocument()
    })

    it('renueva una sola vez aunque la aplicación se monte dos veces', async () => {
        /* Es lo que hace `StrictMode` en desarrollo. Dos renovaciones a la vez
           cierran la sesión: el backend rota el token de renovación y, si le
           llega uno ya usado, da por robada la sesión entera. */
        signInAs('fvazquez')

        const renewals = await countingRenewals(async () => {
            renderWithProviders(<Probe />)
            renderWithProviders(<Probe />)
            await waitFor(() => expect(screen.getAllByText(/^Roles:/)).toHaveLength(2))
        })

        expect(renewals).toBe(1)
    })
})

describe('sesión después de un 403', () => {
    /* Si a alguien le sacan un rol con la sesión abierta y sigue navegando
       sin recargar, la primera pantalla que ya no puede ver vuelve con 403.
       Ese rechazo es la señal: se traen los roles actuales y el rail y las
       rutas se acomodan solos. El contrato usa el mismo `FORBIDDEN` para "no
       tenés el rol" y para "no sos el abogado responsable" (D-30), así que a
       veces se verifica de más: es un pedido, no un problema. */

    function storedRoles(username: string, roles: ('ADMINISTRATOR' | 'LAWYER' | 'SECRETARY')[]) {
        storedUser(username).roles = roles
    }

    it('un 403 trae los roles actuales sin recargar', async () => {
        renderWithProviders(<Probe />, { as: 'fvazquez' })
        await screen.findByText(/^Roles: ADMINISTRATOR, LAWYER ·/)

        storedRoles('fvazquez', ['LAWYER'])
        await expect(api.get('/users')).rejects.toMatchObject({ code: 'FORBIDDEN' })

        expect(await screen.findByText(/^Roles: LAWYER ·/)).toBeInTheDocument()
    })

    it('la pantalla que ya no le corresponde pasa a "sin acceso"', async () => {
        /** Una pantalla de administración que pide sus datos al montarse. */
        function UsersScreen() {
            useEffect(() => {
                api.get('/users').catch(() => undefined)
            }, [])
            return <p>Pantalla de usuarios</p>
        }

        signInAs('fvazquez')
        storedRoles('fvazquez', ['LAWYER'])
        // Simula la sesión vieja: la app arrancó cuando todavía era administrador.
        server.use(http.post('*/auth/refresh', () => HttpResponse.error(), { once: true }))

        renderWithProviders(<RequireAccess />, {
            route: '/usuarios',
            children: [{ path: '/usuarios', element: <UsersScreen /> }],
        })

        expect(await screen.findByText('No tenés permiso para ver esta sección')).toBeInTheDocument()
        expect(screen.queryByText('Pantalla de usuarios')).not.toBeInTheDocument()
    })

    it('varios 403 juntos verifican una sola vez', async () => {
        renderWithProviders(<Probe />, { as: 'fvazquez' })
        await waitForSession()
        storedRoles('fvazquez', ['LAWYER'])

        const renewals = await countingRenewals(async () => {
            await Promise.allSettled([api.get('/users'), api.get('/users?page=2'), api.get('/users/3')])
            await screen.findByText(/^Roles: LAWYER ·/)
        })

        expect(renewals).toBe(1)
    })

    it('un error que no es 403 no verifica nada', async () => {
        renderWithProviders(<Probe />, { as: 'fvazquez' })
        await waitForSession()

        const renewals = await countingRenewals(async () => {
            await expect(api.get('/users/9999')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' })
        })

        expect(renewals).toBe(0)
    })
})
