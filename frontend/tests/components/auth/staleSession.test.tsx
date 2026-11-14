import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { useAuth } from '@/app/providers/AuthContext'
import { settleRenewal } from '@/shared/api/http'
import { readStoredSession } from '@/features/auth/utils/sessionStorage'
import { configureMocks } from '@/shared/mocks/server'
import { resetMockDb } from '@/shared/mocks'
import { renderWithProviders } from '../../setup/render'

/**
 * Una sesión que ya terminó no puede tocar la que está abierta ahora.
 *
 * H-55 de `docs/auditoria-front`: con todos los núcleos, un test que se
 * cortaba por tiempo dejaba en vuelo la renovación del arranque
 * (`POST /auth/refresh`). Volvía ya durante el test siguiente, con 401 —la
 * base del mock se había reiniciado— y le cerraba la sesión a ese test, que
 * fallaba también. Le llegaba por dos lados:
 *
 * - el `AuthProvider` ya desmontado cerraba la sesión guardada, que para
 *   entonces era la del test nuevo;
 * - el interceptor de `http.ts`, ante ese 401, llamaba al `signOut` del
 *   proveedor nuevo, aunque el pedido había salido con otro token.
 *
 * Lo segundo vale también en la aplicación: si en otra pestaña entró otra
 * persona, un 401 de un pedido que salió con el token anterior no le cierra
 * la sesión a ella.
 */

function Who() {
    const { session } = useAuth()
    return <p>{session ? `Adentro: ${session.user.username}` : 'Sin sesión'}</p>
}

/** Lo que hace `afterEach` entre un test y otro, menos esperar la renovación. */
function startOverWithoutWaiting() {
    resetMockDb()
    localStorage.clear()
    configureMocks({ latencyProfile: null })
}

/**
 * Monta una sesión de `gestion` con la renovación del arranque en vuelo y la
 * desmonta. Espera a que el pedido salga, como en la suite: el interceptor
 * pone el token al enviar, y si se desmontara en el acto saldría con el token
 * de la sesión siguiente.
 */
async function leaveRenewalInFlight() {
    configureMocks({ latencyProfile: { 'POST /auth/refresh': 200 } })
    const first = renderWithProviders(<Who />, { as: 'gestion' })
    await new Promise((resolve) => setTimeout(resolve, 50))
    first.unmount()
}

describe('una sesión que ya terminó', () => {
    it('su renovación, si vuelve tarde con 401, no le cierra la sesión a la que se abrió después', async () => {
        await leaveRenewalInFlight()
        startOverWithoutWaiting()

        renderWithProviders(<Who />, { as: 'mrios' })
        expect(await screen.findByText('Adentro: mrios')).toBeInTheDocument()

        // La renovación vieja ya volvió, con 401.
        await new Promise((resolve) => setTimeout(resolve, 400))

        expect(screen.getByText('Adentro: mrios')).toBeInTheDocument()
        expect(readStoredSession()?.user.username).toBe('mrios')
    })

    it('entre un test y otro se espera la renovación en vuelo, así el siguiente renueva con su sesión', async () => {
        await leaveRenewalInFlight()
        await settleRenewal()
        startOverWithoutWaiting()

        renderWithProviders(<Who />, { as: 'mrios' })
        const issued = localStorage.getItem('vz.token')
        expect(await screen.findByText('Adentro: mrios')).toBeInTheDocument()

        // Renovó: el token del arranque ya no es el que se emitió al entrar.
        expect(localStorage.getItem('vz.token')).not.toBe(issued)
    })
})
