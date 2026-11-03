import { describe, expect, it } from 'vitest'
import { ROUTE_TABLE } from '@/shared/mocks/handlers'
import {
    latencyFor,
    latencyFromEnv,
    latencyProfileFromEnv,
    mockOptions,
    REALISTIC_LATENCY,
} from '@/shared/mocks/msw-handlers'

/**
 * Demora del mock por ruta (`VITE_MOCK_LATENCY_PROFILE`). Sólo cambia cuánto
 * tarda el mock en desarrollo: los tests corren con `latencyMs: 0` y sin perfil.
 */
describe('demora del mock', () => {
    it('cada ruta del perfil realistic existe en la tabla de rutas del mock', () => {
        // Una clave mal escrita no falla en ningún lado: la ruta tomaría la demora general sin avisar.
        const routes = new Set(ROUTE_TABLE.map((r) => `${r.method} ${r.path}`))
        const unknown = Object.keys(REALISTIC_LATENCY).filter((key) => !routes.has(key))
        expect(unknown).toEqual([])
    })

    it('cada rango del perfil realistic va de menor a mayor', () => {
        for (const latency of Object.values(REALISTIC_LATENCY)) {
            if (typeof latency === 'number') continue
            expect(latency[0]).toBeLessThanOrEqual(latency[1])
        }
    })

    it('una ruta del perfil usa su demora y otra cualquiera, la general', () => {
        const options = { ...mockOptions(), latencyMs: 100, latencyProfile: { 'GET /cases/:caseId': 900 } }
        expect(latencyFor('GET', '/cases/:caseId', options)).toBe(900)
        expect(latencyFor('GET', '/clients', options)).toBe(100)
    })

    it('sin perfil todas las rutas usan la demora general', () => {
        const options = { ...mockOptions(), latencyMs: [200, 400] as const, latencyProfile: null }
        expect(latencyFor('POST', '/cases/:caseId/case-files', options)).toEqual([200, 400])
    })

    it('lee el perfil de la variable de entorno, sin importar mayúsculas ni espacios', () => {
        expect(latencyProfileFromEnv('realistic')).toBe(REALISTIC_LATENCY)
        expect(latencyProfileFromEnv(' Realistic ')).toBe(REALISTIC_LATENCY)
        expect(latencyProfileFromEnv('rapido')).toBeUndefined()
        expect(latencyProfileFromEnv('')).toBeUndefined()
        expect(latencyProfileFromEnv(undefined)).toBeUndefined()
    })

    it('lee la demora general fija o como rango', () => {
        expect(latencyFromEnv('800')).toBe(800)
        expect(latencyFromEnv('400-1500')).toEqual([400, 1500])
        expect(latencyFromEnv('lento')).toBeUndefined()
    })
})
