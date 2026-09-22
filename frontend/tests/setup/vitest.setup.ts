/**
 * Se ejecuta antes de cada archivo de test de Vitest.
 *
 * Enciende MSW con los mismos handlers que usa la aplicación y deja todo como
 * nuevo después de cada test: los handlers pisados con `server.use`, la base
 * en memoria del mock, la caché de TanStack Query y el almacenamiento del
 * navegador. Así ningún test depende de lo que hizo el anterior.
 */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { configureMocks, server } from '@/shared/mocks/server'
import { resetMockDb } from '@/shared/mocks'
import { queryClient } from '@/shared/api/queryClient'

/** Sin demora ni logs: en los tests sólo hacen más lento y más ruidoso todo. */
const TEST_MOCK_OPTIONS = {
    latencyMs: 0,
    log: false,
    forceFailure: null,
    passthrough: [],
} as const

beforeAll(() => {
    configureMocks({ ...TEST_MOCK_OPTIONS, passthrough: [] })
    /* 'error' y no 'bypass': un endpoint mal escrito tiene que hacer fallar
       el test, no intentar salir a la red. */
    server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
    cleanup()
    server.resetHandlers()
    resetMockDb()
    configureMocks({ ...TEST_MOCK_OPTIONS, passthrough: [] })
    queryClient.clear()
    localStorage.clear()
})

afterAll(() => {
    server.close()
})
