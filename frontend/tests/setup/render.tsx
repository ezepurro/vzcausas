/**
 * `renderWithProviders`: el `render` de Testing Library con todo lo que un
 * componente de la aplicación necesita alrededor para funcionar.
 *
 * Arma los mismos proveedores que `App.tsx`, en el mismo orden —TanStack
 * Query, avisos, sesión— y un router en memoria. Sin esto, cualquier
 * componente que use `useNavigate`, `useQuery`, `useToast` o `useAuth`
 * revienta apenas se monta.
 *
 * ```tsx
 * const { user } = renderWithProviders(<UsersPage />, { as: 'fvazquez', route: '/usuarios' })
 * await user.click(screen.getByRole('button', { name: 'Registrar usuario' }))
 * ```
 */

import type { ReactElement } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { queryClient } from '@/shared/api/queryClient'
import { ToastProvider } from '@/app/providers/ToastProvider'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { writeStoredSession } from '@/features/auth/utils/sessionStorage'
import { db, EXPIRES_IN, issueToken, toUser } from '@/shared/mocks'

export interface RenderOptions {
    /**
     * Abre la sesión con este usuario de los fixtures antes de renderizar:
     * `'fvazquez'` (administrador), `'mrios'` (abogado), `'gestion'`
     * (secretaría). Sin `as`, se renderiza sin sesión.
     */
    as?: string
    /** La URL en la que arranca el router. Por defecto `/`. */
    route?: string
    /** El patrón de ruta donde se monta `ui`. Por defecto, cualquiera (`*`). */
    path?: string
    /**
     * Rutas de más, para verificar a dónde navega el componente. Cada una
     * muestra un texto fácil de buscar, por ejemplo:
     * `{ path: '/login', element: <p>Pantalla de login</p> }`.
     */
    routes?: RouteObject[]
    /**
     * Rutas hijas de `ui`, para los componentes que son un marco o una guarda
     * y dibujan un `<Outlet />`. Con `children`, `ui` se monta como ruta de
     * layout (sin `path`).
     */
    children?: RouteObject[]
    /** `state` de la entrada inicial del historial (lo que lee `useLocation().state`). */
    state?: unknown
}

/**
 * Inicia sesión "por atrás": emite un token en la base del mock y lo guarda
 * donde lo busca la aplicación, igual que después de un login de verdad.
 *
 * Hay que llamarla ANTES de renderizar, porque `AuthProvider` lee la sesión
 * guardada en el primer render. La base del mock se reinicia después de cada
 * test, así que el token sólo vive durante el test que lo pidió.
 */
export function signInAs(username: string) {
    const stored = db.users.find((u) => u.username === username)
    if (!stored) throw new Error(`No hay ningún usuario "${username}" en los fixtures del mock.`)

    const user = toUser(stored)
    const accessToken = issueToken(stored.id)
    writeStoredSession({ accessToken, tokenType: 'Bearer', expiresIn: EXPIRES_IN, user })
    return user
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
    const { as, route = '/', path = '*', routes = [], children, state } = options

    if (as) signInAs(as)

    const main: RouteObject = children ? { element: ui, children } : { path, element: ui }

    // `route` puede traer query (`/usuarios?page=2`): el router la quiere aparte.
    const url = new URL(route, 'http://localhost')
    const router = createMemoryRouter([main, ...routes], {
        initialEntries: [{ pathname: url.pathname, search: url.search, state }],
    })

    const user = userEvent.setup()

    const result = render(
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <AuthProvider>
                    <RouterProvider router={router} />
                </AuthProvider>
            </ToastProvider>
        </QueryClientProvider>,
    )

    return { ...result, user, router }
}

/**
 * Espera a que `AuthProvider` termine de verificar la sesión guardada.
 *
 * Con sesión, lo primero que se ve es "Verificando la sesión…": al montarse,
 * `AuthProvider` le pide al servidor los roles actuales (`POST /auth/refresh`)
 * antes de mostrar la pantalla. Un test que consulte la pantalla con `getBy…`
 * apenas renderiza tiene que esperar esto antes; los `findBy…` ya esperan
 * solos.
 */
export async function waitForSession() {
    await waitFor(() => expect(screen.queryByText('Verificando la sesión…')).not.toBeInTheDocument())
}
