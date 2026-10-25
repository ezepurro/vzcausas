/**
 * Arranque de los mocks en el navegador.
 *
 * MSW registra un service worker (`public/mockServiceWorker.js`) que
 * intercepta el tráfico de red de verdad. Consecuencias que conviene tener
 * presentes:
 *
 * - Los pedidos **se ven en la pestaña Network** con su código y su cuerpo,
 *   igual que contra el backend real.
 * - Lo que no esté en `handlers` sale a la red sin tocarse, así que el HMR
 *   de Vite, las fuentes y los assets siguen funcionando.
 * - `startMocks()` es **asíncrono**: hay que esperarlo antes de renderizar,
 *   si no los primeros pedidos se escapan sin mockear.
 *
 * Este archivo sólo se importa desde el navegador. Para tests en Node está
 * `server.ts`.
 */

import { setupWorker, type SetupWorker } from 'msw/browser';
import { persistSessions } from './db';
import { configureMocks, handlers, latencyFromEnv, mockOptions, type MockOptions } from './msw-handlers';

/** Reexportados acá para que el navegador tenga una sola puerta de entrada. */
export { configureMocks, mockOptions, mocksEnabledByEnv, type MockOptions } from './msw-handlers';

export const worker: SetupWorker = setupWorker(...handlers);

/**
 * Registra el service worker y empieza a interceptar.
 *
 * ```ts
 * // src/main.tsx
 * async function bootstrap() {
 *   if (import.meta.env.VITE_USE_MOCKS === 'true') {
 *     const { startMocks } = await import('@/shared/mocks/browser')
 *     await startMocks()
 *   }
 *   createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
 * }
 * bootstrap()
 * ```
 *
 * El `import()` dinámico es a propósito: así MSW no entra en el bundle de
 * producción.
 */
export async function startMocks(changes: Partial<MockOptions> = {}): Promise<void> {
    // La demora de `.env.local` (`VITE_MOCK_LATENCY`) gana sobre el default,
    // y lo que se pase acá gana sobre las dos.
    const envLatency = latencyFromEnv(import.meta.env.VITE_MOCK_LATENCY);
    configureMocks({ ...(envLatency !== undefined && { latencyMs: envLatency }), ...changes });
    // Si no, cada recarga de la página cierra la sesión: ver `persistSessions`.
    persistSessions(localStorage);
    const { log } = mockOptions();

    await worker.start({
        // Lo que no matchea ningún handler sale a la red como siempre, sin
        // siquiera avisar: si no, la consola se llena con los assets de Vite.
        onUnhandledRequest: 'bypass',
        quiet: !log,
        serviceWorker: {
            // Respeta el `base` de Vite por si algún día la app no se sirve
            // desde la raíz del dominio.
            url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
        },
    });

    if (log) {
        console.info('[mock] API simulada activa. Los pedidos se ven en la pestaña Network.');
    }
}

/** Da de baja la intercepción. El service worker queda registrado. */
export function stopMocks(): void {
    worker.stop();
}
