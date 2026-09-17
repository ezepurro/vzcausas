import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'

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

      // Las secciones del sprint 1. Hasta que existan las pantallas,
      // se agregan acá una por una.
      // { path: 'usuarios', element: <UsuariosPage /> },
      // { path: 'abogados', element: <AbogadosPage /> },
      // { path: 'estados-y-plazos', element: <EstadosYPlazosPage /> },

      // reportes) todavía no tiene pantalla y cae acá.
        { path: '*',  },
    ],
    },
])