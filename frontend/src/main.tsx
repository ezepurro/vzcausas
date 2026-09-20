import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
//import { QueryProvider } from '@/app/providers/QueryProvider'
//import { ToastProvider } from '@/app/providers/ToastProvider'
import { App } from '@/App'
import '@/styles/index.css'

/**
 * Arranque de la aplicación.
 *
 * Con VITE_USE_MOCKS=true hay que esperar a que MSW registre su service
 * worker ANTES de renderizar: si no, los primeros pedidos se escapan sin
 * interceptar y la pantalla arranca con un error que después no se repite.
 * Por eso el arranque es asíncrono.
 *
 * El import() es dinámico a propósito: así MSW no entra en el bundle de
 * producción.
 */
async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { startMocks } = await import('@/shared/mocks/browser')
    await startMocks()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
