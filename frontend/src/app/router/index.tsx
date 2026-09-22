import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { RequireSession } from '@/app/router/RequireSession'
import { RedirectIfSession } from '@/app/router/RedirectIfSession'
import { SectionPlaceholder } from '@/app/router/SectionPlaceholder'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { HomePage } from '@/features/home/pages/HomePage'
import { ProceduralStatesPage } from '@/features/legal-params/pages/ProceduralStatesPage'
import { UsersPage } from '@/features/users/pages/UsersPage'
import { LawyersPage } from '@/features/lawyers/pages/LawyersPage'

export const router = createBrowserRouter([
    {
        // Sin sesión: sólo el login. Con sesión, la guarda rebota a Inicio.
        element: <RedirectIfSession />,
        children: [
            {
                element: <AuthLayout />,
                children: [{ path: '/login', element: <LoginPage /> }],
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
                    { index: true, element: <Navigate to="/inicio" replace /> },
                    { path: 'inicio', element: <HomePage /> },
                    { path: 'estados-y-plazos', element: <ProceduralStatesPage /> },
                    { path: 'usuarios', element: <UsersPage /> },
                    { path: 'abogados', element: <LawyersPage /> },

                    // Lo que el rail nombra pero todavía no existe cae acá.
                    { path: '*', element: <SectionPlaceholder /> },
                ],
            },
        ],
    },
])
