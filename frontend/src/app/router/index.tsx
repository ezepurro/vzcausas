import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { RequireSession } from '@/app/router/RequireSession'
import { RedirectIfSession } from '@/app/router/RedirectIfSession'
import { SectionPlaceholder } from '@/app/router/SectionPlaceholder'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { HomePage } from '@/features/home/pages/HomePage'
import { ProceduralStatesPage } from '@/features/legal-params/pages/ProceduralStatesPage'

/**
 * El mapa de rutas y quién puede entrar a cada una.
 *
 * Son dos mundos separados por una guarda: lo que se ve sin sesión y lo que
 * vive adentro del rail. Ninguna pantalla comprueba la sesión por su cuenta:
 * si está montada, es porque la guarda la dejó pasar.
 */
export const router = createBrowserRouter([
    {
        // Sin sesión: sólo el login. Con sesión, la guarda rebota a Inicio.
        element: <RedirectIfSession />,
        children: [
            {
                element: <AuthLayout />,
                children: [
                    { path: '/login', element: <LoginPage /> },
                ],
            },
        ],
    },
    {
        // Con sesión: todo lo que vive adentro del rail.
        element: <RequireSession />,
        children: [
            {
                element: <AppLayout />,
                children: [
                    // La raíz manda a Inicio, que es donde arranca el prototipo.
                    { index: true, element: <Navigate to="/inicio" replace /> },
                    { path: 'inicio', element: <HomePage /> },
                    { path: 'estados-y-plazos', element: <ProceduralStatesPage /> },

                    // Las secciones que faltan se agregan acá una por una.
                    // { path: 'usuarios', element: <UsuariosPage /> },
                    // { path: 'abogados', element: <AbogadosPage /> },

                    // Todo lo que el rail nombra pero todavía no existe cae acá.
                    { path: '*', element: <SectionPlaceholder /> },
                ],
            },
        ],
    },
])
