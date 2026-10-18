import { describe, expect, it } from 'vitest'
import { http as mswHttp, HttpResponse } from 'msw'
import { server } from '@/shared/mocks/server'
import { http } from '@/shared/api/http'
import { isApiError } from '@/shared/api/ApiError'
import { errorBody } from '@/shared/mocks'

/**
 * `ApiError.retryAfterSeconds` se lee del encabezado `Retry-After`, no de
 * `details` (V3 §4, Límite de frecuencia) — ver el comentario de
 * `ApiError.ts` para el porqué. Esto es lo único que prueba esa lectura de
 * forma aislada; `LoginPage.test.tsx` prueba el efecto visible (la cuenta
 * regresiva), no el parseo en sí.
 */
describe('http: ApiError.retryAfterSeconds', () => {
    async function requestWithHeaders(headers: Record<string, string>) {
        server.use(
            mswHttp.get('*/diagnostic-429', () =>
                HttpResponse.json(
                    errorBody('TOO_MANY_REQUESTS', 'Demasiadas peticiones.', null),
                    { status: 429, headers },
                ),
            ),
        )
        try {
            await http.get('/diagnostic-429')
            throw new Error('no debería resolver')
        } catch (error) {
            if (!isApiError(error)) throw error
            return error
        }
    }

    it('lee el valor cuando el encabezado viene', async () => {
        const error = await requestWithHeaders({ 'Retry-After': '90' })
        expect(error.retryAfterSeconds).toBe(90)
    })

    it('es null si no vino el encabezado', async () => {
        const error = await requestWithHeaders({})
        expect(error.retryAfterSeconds).toBeNull()
    })

    it('es null ante un valor no numérico', async () => {
        const error = await requestWithHeaders({ 'Retry-After': 'pronto' })
        expect(error.retryAfterSeconds).toBeNull()
    })

    it('es null ante cero o negativo, que no son una espera real', async () => {
        expect((await requestWithHeaders({ 'Retry-After': '0' })).retryAfterSeconds).toBeNull()
        expect((await requestWithHeaders({ 'Retry-After': '-5' })).retryAfterSeconds).toBeNull()
    })
})
