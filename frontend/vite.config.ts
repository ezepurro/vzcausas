import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  /* Las variables de .env.local no están en process.env cuando se evalúa
     este archivo: hay que leerlas a mano. */
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
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
    server: {
      /**
       * Todo lo que empiece con /api se reenvía al backend.
       *
       * Mientras VITE_USE_MOCKS sea true esto no se usa: el service worker
       * de MSW intercepta el pedido antes de que salga a la red. Está puesto
       * para el día que se apaguen los mocks.
       *
       * Por qué un proxy y no apuntar derecho a http://localhost:3000: el
       * backend entrega el token de renovación en una cookie `SameSite=Lax`,
       * que el navegador no manda entre orígenes distintos. Con el proxy,
       * para el navegador todo vive en el mismo origen y la cookie viaja
       * sola. Es la opción que el propio backend recomienda en su Q-05
       * mientras no haya HTTPS local.
       *
       * El destino sale de VITE_BACKEND_URL para que cada uno lo apunte a
       * donde lo tenga corriendo, sin tocar este archivo.
       *
       * Se mira primero process.env porque loadEnv solo lee archivos .env:
       * dentro de Docker la variable llega por el `environment` del compose,
       * y ahí el backend es http://backend:3000, no localhost.
       */
      proxy: {
        '/api': {
          target:
            process.env.VITE_BACKEND_URL ??
            env.VITE_BACKEND_URL ??
            'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
