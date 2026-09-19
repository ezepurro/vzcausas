import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { ToastProvider } from '@/app/providers/ToastProvider'
import { App } from '@/App'
import '@/styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
