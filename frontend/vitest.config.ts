import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

/**
 * Configuración de Vitest: `tests/unit/` y `tests/components/`.
 *
 * Parte de la config de Vite, así los tests resuelven el alias `@` y el JSX
 * exactamente igual que la aplicación. Ver `docs/Frontend-Architecture/TESTING.md`.
 *
 * Sólo agarra los `.test.*`: los `.spec.ts` de `tests/e2e/` son de Playwright
 * y Vitest no los sabe correr.
 */
export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: 'jsdom',
      include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/components/**/*.test.{ts,tsx}'],
      setupFiles: ['tests/setup/vitest.setup.ts'],
      /* Los mocks usan localStorage, la base en memoria y el QueryClient
         compartido: son estado de módulo. Cada archivo corre aislado y el
         setup limpia entre tests. */
      restoreMocks: true,
    },
  }),
)
