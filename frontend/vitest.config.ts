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
      /* La mitad de los núcleos lógicos, que suele ser la cantidad de
         núcleos físicos. Por defecto Vitest usa todos menos uno, y con jsdom
         cada proceso ocupa un núcleo entero: mientras todos arrancan a la vez,
         los primeros tests corren tan lentos que sus esperas de 1 s no llegan
         y fallan de a dos o tres por corrida, distintos cada vez (H-55 de
         `docs/auditoria-front`). Medido el 13/11/2026 en 8 núcleos físicos y
         16 lógicos: con todos, 83–95 s y fallas; con la mitad, 84–88 s y
         ninguna. `--maxWorkers` en la línea de comandos lo pisa. */
      maxWorkers: '50%',
    },
  }),
)
