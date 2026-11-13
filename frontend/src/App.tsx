import { RouterProvider } from 'react-router'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { ToastProvider } from '@/app/providers/ToastProvider'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { router } from '@/app/router'

/**
 * El orden de los proveedores no es casual:
 *
 * - `QueryProvider` primero, porque la sesión limpia la caché al cerrarse.
 * - `ToastProvider` antes que el router, para que un aviso sobreviva a una
 *   redirección: al cerrar sesión, el toast se dispara y la pantalla cambia.
 * - `AuthProvider` envolviendo al router, porque las guardas de ruta leen la
 *   sesión para decidir a dónde mandar a cada uno.
 */
export function App() {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryProvider>
  )
}
