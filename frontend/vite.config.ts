import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // El alias "@" apunta a src/. Sirve para importar desde la raíz del
    // proyecto en vez de contar carpetas hacia atrás:
    //   import { http } from '@/shared/api/http'
    // en lugar de '../../../shared/api/http'.
    // Tiene que estar declarado también en tsconfig.app.json, si no
    // TypeScript no lo reconoce aunque Vite sí lo resuelva.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
