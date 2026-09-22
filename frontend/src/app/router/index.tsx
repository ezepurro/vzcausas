import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { NotFoundLayout } from '@/app/layouts/NotFoundLayout'
import { ProceduralStatesPage } from '@/features/legal-params/pages/ProceduralStatesPage';
import { UsersPage } from '@/features/users/pages/UsersPage';
import { LawyersPage } from '@/features/lawyers/pages/LawyersPage'


export const router = createBrowserRouter([
    {
    // Sin sesión: sólo el login.
    element: <AuthLayout />,
    children: [
    { path: '/login', element: <div>Login</div> },
    ],
    },
    {
    // Con sesión: todo lo que vive adentro del rail.
    element: <AppLayout />,
    children: [
      // La raíz manda a Inicio, que es donde arranca el prototipo.
        { index: true, element: <Navigate to="/inicio" replace /> },
        { path: 'estados-y-plazos', element: <ProceduralStatesPage /> },
        { path: 'usuarios', element: <UsersPage /> },
        { path: 'abogados', element: <LawyersPage /> },

      // Las secciones del sprint 1. Hasta que existan las pantallas,
      // se agregan acá una por una.
    ],
    },
    // Cualquier ruta que no esté arriba (incluidas las secciones del rail que
    // todavía no tienen pantalla, como causas o reportes) cae acá.
    { path: '*', element: <NotFoundLayout /> },
])