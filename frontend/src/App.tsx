import { RouterProvider } from 'react-router'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { ToastProvider } from '@/app/providers/ToastProvider'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { SessionTransitionProvider } from '@/app/providers/SessionTransitionProvider'
import { BackgroundTasksProvider } from '@/app/providers/BackgroundTasksProvider'
import { TASK_HANDLERS } from '@/app/tasks'
import { router } from '@/app/router'

/**
 * El orden de los proveedores no es casual:
 *
 * - `QueryProvider` primero, porque la sesión limpia la caché al cerrarse.
 * - `ToastProvider` antes que el router, para que un aviso sobreviva a una
 *   redirección: al cerrar sesión, el toast se dispara y la pantalla cambia.
 * - `SessionTransitionProvider` por encima del router, para que el telón
 *   entre la app y el login siga a la vista mientras la pantalla cambia.
 * - `AuthProvider` envolviendo al router, porque las guardas de ruta leen la
 *   sesión para decidir a dónde mandar a cada uno.
 * - `BackgroundTasksProvider` dentro de `AuthProvider`, porque las tareas en
 *   segundo plano son de quien tiene la sesión abierta, y fuera del router,
 *   porque siguen mientras se cambia de pantalla.
 */
export function App() {
  return (
    <QueryProvider>
      <ToastProvider>
        <SessionTransitionProvider>
          <AuthProvider>
            <BackgroundTasksProvider handlers={TASK_HANDLERS}>
              <RouterProvider router={router} />
            </BackgroundTasksProvider>
          </AuthProvider>
        </SessionTransitionProvider>
      </ToastProvider>
    </QueryProvider>
  )
}
