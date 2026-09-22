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

    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

    webServer: {
        command: `npx vite --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { VITE_USE_MOCKS: 'true' },
    },
})
