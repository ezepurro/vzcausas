import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { Outlet } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'
import { RequireSession } from '@/app/router/RequireSession'
import { queryClient } from '@/shared/api/queryClient'
import { TOKEN_KEY } from '@/shared/api/http'
import { clearStoredSession } from '@/features/auth/utils/sessionStorage'
import { renderWithProviders, signInAs, waitForSession } from '../../setup/render'

/**
 * La sesión vive en `localStorage`, que comparten todas las pestañas. Estos
 * tests hacen de "otra pestaña": cambian lo guardado y avisan con el evento
 * `storage`, que el navegador le manda sólo a las demás pestañas.
 *
 * H-01 de `docs/auditoria-front`: sin el oyente de `AuthProvider`, esta
 * pestaña seguía mostrando al usuario anterior y su caché.
 */

function Who() {
    const { session } = useAuth()
    return <p>{session ? `Adentro: ${session.user.username}` : 'Sin sesión'}</p>
}

function renderApp() {
    return renderWithProviders(<RequireSession />, {
        as: 'fvazquez',
        route: '/causas',
        children: [{ path: '/causas', element: <><Who /><Outlet /></> }],
        routes: [{ path: '/login', element: <p>Pantalla de login</p> }],
    })
}

/** Lo que el navegador le avisa a esta pestaña cuando otra toca la sesión. */
function notifyFromOtherTab(key: string | null = TOKEN_KEY) {
    act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key, storageArea: localStorage }))
    })
}

describe('la sesión entre pestañas', () => {
    it('si cierran la sesión en otra pestaña, ésta va al login y no deja nada en la caché', async () => {
        renderApp()
        await waitForSession()
        expect(screen.getByText('Adentro: fvazquez')).toBeInTheDocument()
        queryClient.setQueryData(['cases', 'list'], { data: ['una causa del usuario anterior'] })

        clearStoredSession()
        notifyFromOtherTab()

        expect(await screen.findByText('Pantalla de login')).toBeInTheDocument()
        expect(queryClient.getQueryData(['cases', 'list'])).toBeUndefined()
    })

    it('no recuerda la pantalla: quien entre después puede ser otra persona', async () => {
        const { router } = renderApp()
        await waitForSession()

        clearStoredSession()
        notifyFromOtherTab()

        await screen.findByText('Pantalla de login')
        expect(router.state.location.state).toBeFalsy()
    })

    it('si en otra pestaña entra otra persona, ésta pasa a ser de ella y se vacía la caché', async () => {
        renderApp()
        await waitForSession()
        queryClient.setQueryData(['cases', 'list'], { data: ['una causa del usuario anterior'] })

        signInAs('gestion')
        notifyFromOtherTab()

        expect(await screen.findByText('Adentro: gestion')).toBeInTheDocument()
        expect(queryClient.getQueryData(['cases', 'list'])).toBeUndefined()
    })

    it('si la otra pestaña sólo renovó el token del mismo usuario, la caché se conserva', async () => {
        renderApp()
        await waitForSession()
        queryClient.setQueryData(['cases', 'list'], { data: ['sigue siendo suya'] })

        signInAs('fvazquez')
        notifyFromOtherTab()

        expect(screen.getByText('Adentro: fvazquez')).toBeInTheDocument()
        expect(queryClient.getQueryData(['cases', 'list'])).toEqual({ data: ['sigue siendo suya'] })
    })

    it('un cambio en otra clave del almacenamiento no toca la sesión', async () => {
        renderApp()
        await waitForSession()
        queryClient.setQueryData(['cases', 'list'], { data: ['intacta'] })

        notifyFromOtherTab('vz-mock-sessions')

        expect(screen.getByText('Adentro: fvazquez')).toBeInTheDocument()
        expect(queryClient.getQueryData(['cases', 'list'])).toEqual({ data: ['intacta'] })
    })
})
