/**
 * Arranque de los mocks en Node: tests (Vitest/Jest) y cualquier script que
 * corra fuera del navegador.
 *
 * Son **los mismos handlers** que usa el service worker, así que un test y
 * la aplicación ven exactamente la misma API simulada.
 *
 * ```ts
 * import { beforeAll, afterEach, afterAll } from 'vitest'
 * import { server } from '@/shared/mocks/server'
 * import { resetMockDb } from '@/shared/mocks'
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
 * afterEach(() => { server.resetHandlers(); resetMockDb() })
 * afterAll(() => server.close())
 * ```
 *
 * Ojo: en Node conviene `onUnhandledRequest: 'error'` —al revés que en el
 * navegador— para que un endpoint mal escrito falle el test en vez de
 * intentar salir a la red.
 *
 * Este archivo importa `msw/node`; no se importa nunca desde el navegador,
 * y por eso el barrel (`index.ts`) no lo reexporta.
 */

import { setupServer } from 'msw/node';
import { handlers } from './msw-handlers';

/** Reexportados acá para que un test tenga una sola puerta de entrada. */
export { configureMocks, mockOptions, type MockOptions } from './msw-handlers';

export const server = setupServer(...handlers);
