import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { errorBody } from '@/shared/mocks'
import { readStoredSession } from '@/features/auth/utils/sessionStorage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RedirectIfSession } from '@/app/router/RedirectIfSession'

/**
 * La pantalla se monta **debajo de su guarda**, como en `router/index.tsx`, y
 * no suelta.
 *
 * No es ceremonia. `LoginPage` no navega: abre la sesión y el destino lo
 * decide `RedirectIfSession`. Montada sola, la pantalla no llega nunca a
 * ningún lado, y —peor— así estaba antes: el test "vuelve a la pantalla que se
 * había pedido" pasaba en verde mientras la aplicación mandaba a Inicio,
 * porque sin la guarda encima no existía la carrera que causaba el bug. La
 * composición de las dos piezas es justamente lo que hay que probar.
 */
const ROUTES = {
    route: '/login',
    children: [{ path: '/login', element: <LoginPage /> }],
    routes: [
        { path: '/inicio', element: <p>Pantalla de inicio</p> },
        { path: '/usuarios', element: <p>Pantalla de usuarios</p> },
    ],
}

describe('LoginPage', () => {
    it('con credenciales válidas abre la sesión y va a inicio', async () => {
        const { user } = renderWithProviders(<RedirectIfSession />, ROUTES)

        await user.type(screen.getByLabelText('Usuario'), 'fvazquez')
        await user.type(screen.getByLabelText('Contraseña'), 'password1')
        await user.click(screen.getByRole('button', { name: 'Ingresar' }))

        expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument()
        expect(readStoredSession()?.user.username).toBe('fvazquez')
    })

    it('vuelve a la pantalla que se había pedido antes del login', async () => {
        const { user } = renderWithProviders(<RedirectIfSession />, { ...ROUTES, state: { from: '/usuarios' } })

        await user.type(screen.getByLabelText('Usuario'), 'fvazquez')
        await user.type(screen.getByLabelText('Contraseña'), 'password1')
        await user.click(screen.getByRole('button', { name: 'Ingresar' }))

        expect(await screen.findByText('Pantalla de usuarios')).toBeInTheDocument()
    })

    it('enviado vacío muestra los errores sin llamar al servidor', async () => {
        const { user } = renderWithProviders(<RedirectIfSession />, ROUTES)

        await user.click(screen.getByRole('button', { name: 'Ingresar' }))

        expect(screen.getByText('El nombre de usuario es obligatorio.')).toBeInTheDocument()
        expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument()
        expect(readStoredSession()).toBeNull()
    })

    it('con credenciales inválidas muestra el aviso y borra la contraseña', async () => {
        const { user } = renderWithProviders(<RedirectIfSession />, ROUTES)

        await user.type(screen.getByLabelText('Usuario'), 'fvazquez')
        await user.type(screen.getByLabelText('Contraseña'), 'incorrecta1')
        await user.click(screen.getByRole('button', { name: 'Ingresar' }))

        expect(await screen.findByRole('alert')).toBeInTheDocument()
        expect(screen.getByLabelText('Contraseña')).toHaveValue('')
        expect(screen.getByLabelText('Usuario')).toHaveValue('fvazquez')
        expect(readStoredSession()).toBeNull()
    })

    it('si el servidor falla, muestra su mensaje en el aviso', async () => {
        server.use(
            http.post('*/auth/login', () =>
                HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), {
                    status: 500,
                }),
            ),
        )
        const { user } = renderWithProviders(<RedirectIfSession />, ROUTES)

        await user.type(screen.getByLabelText('Usuario'), 'fvazquez')
        await user.type(screen.getByLabelText('Contraseña'), 'password1')
        await user.click(screen.getByRole('button', { name: 'Ingresar' }))

        expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor de prueba.')
    })

    it('si no hay red, avisa que se revise la conexión', async () => {
        server.use(http.post('*/auth/login', () => HttpResponse.error()))
        const { user } = renderWithProviders(<RedirectIfSession />, ROUTES)

        await user.type(screen.getByLabelText('Usuario'), 'fvazquez')
        await user.type(screen.getByLabelText('Contraseña'), 'password1')
        await user.click(screen.getByRole('button', { name: 'Ingresar' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(/error de red/i)
    })

    /**
     * Bloqueo de login (429, V3 §4). Con reloj real y un `retryAfterSeconds`
     * de 1: mezclar `userEvent` (usa `setTimeout` por dentro) con timers
     * falsos en un árbol con varios niveles de proveedores (query, toasts,
     * sesión, router) resultó frágil —el conteo no avanzaba de forma
     * confiable de una vuelta de render a la siguiente—, así que acá se
     * espera de verdad un segundo en lugar de pelear con esa combinación.
     * La cuenta regresiva en sí, tick por tick, ya está probada sin este
     * ruido en `useCountdown.test.ts`.
     */
    it(
        'ante un bloqueo de login, muestra la cuenta regresiva y se levanta sola al cumplirse',
        async () => {
            server.use(
                http.post('*/auth/login', () =>
                    HttpResponse.json(
                        errorBody(
                            'TOO_MANY_LOGIN_ATTEMPTS',
                            'Demasiados intentos fallidos. Esperá antes de volver a intentar.',
                            { retryAfterSeconds: 1 },
                        ),
                        { status: 429, headers: { 'Retry-After': '1' } },
                    ),
                ),
            )
            const { user } = renderWithProviders(<RedirectIfSession />, ROUTES)

            await user.type(screen.getByLabelText('Usuario'), 'fvazquez')
            await user.type(screen.getByLabelText('Contraseña'), 'password1')
            await user.click(screen.getByRole('button', { name: 'Ingresar' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos fallidos')
            expect(screen.getByRole('button', { name: 'Reintentar en 1 s' })).toBeDisabled()

            /*
             * Cumplido el segundo: el botón vuelve a "Ingresar" y el aviso,
             * que ya no es cierto, se va solo con él — pero en dos renders
             * separados (el segundo lo dispara un efecto que corre después
             * de confirmar el primero). Las dos aserciones van adentro del
             * mismo `waitFor`: si se separan, a veces gana la carrera el
             * render intermedio donde el botón ya está habilitado pero el
             * aviso todavía no se borró, y la segunda aserción falla sin que
             * la aplicación esté haciendo nada mal.
             */
            await waitFor(
                () => {
                    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
                    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
                },
                { timeout: 3000 },
            )
            expect(readStoredSession()).toBeNull()
        },
        5000,
    )
})
