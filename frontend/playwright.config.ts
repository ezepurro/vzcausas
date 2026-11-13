import { defineConfig, devices } from '@playwright/test'

/**
 * Configuración de Playwright: `tests/e2e/`.
 *
 * Levanta la aplicación con Vite y los mocks encendidos (`VITE_USE_MOCKS=true`),
 * así los E2E no dependen del backend ni de una base de datos. Ver
 * `docs/Frontend-Architecture/TESTING.md`.
 *
 * Usa un puerto propio (5199) para no chocar con el `npm run dev` de cada uno.
 * Si ya hay algo corriendo en ese puerto, lo reusa (menos en CI).
 */

const PORT = 5199
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
    testDir: 'tests/e2e',
    testMatch: '**/*.spec.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',

    use: {
        baseURL: BASE_URL,
        // Si un test falla, guarda la traza para verla con `npx playwright show-trace`.
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },

    /* La ventana de referencia de la app es la notebook de 1366 px. La de
       "Desktop Chrome" (1280 × 720) es más angosta: ahí las tablas de 1.040px
       de mínimo (Causas, Usuarios) pasan a fichas, y estas pruebas recorren la
       tabla (tanda 14 de `docs/auditoria-front`). */
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } }],

    webServer: {
        command: `npx vite --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { VITE_USE_MOCKS: 'true' },
    },
})
