import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
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

    it('recorta los espacios del usuario antes de mandarlo', async () => {
        const { user } = renderWithProviders(<RedirectIfSession />, ROUTES)

        await user.type(screen.getByLabelText('Usuario'), '  fvazquez  ')
        await user.type(screen.getByLabelText('Contraseña'), 'password1')
        await user.click(screen.getByRole('button', { name: 'Ingresar' }))

        expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument()
    })

    it('enviado vacío muestra los errores sin llamar al servidor', async () => {
        const { user } = renderWithProviders(<RedirectIfSession />, ROUTES)

        await user.click(screen.getByRole('button', { name: 'Ingresar' }))

        expect(screen.getByText('El nombre de usuario es obligatorio.')).toBeInTheDocument()
        expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument()
        expect(readStoredSession()).toBeNull()
    })

    it('el error de un campo se va apenas se empieza a corregir', async () => {
        const { user } = renderWithProviders(<RedirectIfSession />, ROUTES)

        await user.click(screen.getByRole('button', { name: 'Ingresar' }))
        await user.type(screen.getByLabelText('Usuario'), 'f')

        expect(screen.queryByText('El nombre de usuario es obligatorio.')).not.toBeInTheDocument()
        expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument()
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

    it('un usuario dado de baja no puede entrar', async () => {
        const { user } = renderWithProviders(<RedirectIfSession />, ROUTES)

        await user.type(screen.getByLabelText('Usuario'), 'vsosa')
        await user.type(screen.getByLabelText('Contraseña'), 'password1')
        await user.click(screen.getByRole('button', { name: 'Ingresar' }))

        expect(await screen.findByRole('alert')).toBeInTheDocument()
        expect(screen.queryByText('Pantalla de inicio')).not.toBeInTheDocument()
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

    it('el aviso se va cuando se vuelve a escribir', async () => {
        const { user } = renderWithProviders(<RedirectIfSession />, ROUTES)

        await user.type(screen.getByLabelText('Usuario'), 'fvazquez')
        await user.type(screen.getByLabelText('Contraseña'), 'incorrecta1')
        await user.click(screen.getByRole('button', { name: 'Ingresar' }))
        await screen.findByRole('alert')

        await user.type(screen.getByLabelText('Contraseña'), 'p')

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
})
