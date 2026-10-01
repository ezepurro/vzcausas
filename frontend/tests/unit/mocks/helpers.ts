/**
 * Ayudas para testear el servidor falso sin MSW: se llama a `resolveRequest`
 * directo, que es una función pura respecto del transporte.
 */

import { afterEach, beforeEach, vi } from 'vitest'
import {
    db,
    issueToken,
    resetMockDb,
    resolveRequest,
    type HttpMethod,
    type MockResponse,
} from '@/shared/mocks'

/** El día que usa el prototipo: martes 15/09/2026. */
export const PROTOTYPE_TODAY = '2026-09-15'

/**
 * Fija el reloj en el día del prototipo y rearma la base.
 *
 * Los actos de las semillas se ubican respecto de hoy, así que sin esto un
 * test que afirme "vence hoy" pasaría o fallaría según el día en que corra.
 * Sólo se falsea `Date`: los temporizadores siguen siendo los reales.
 */
export function usePrototypeToday() {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
        resetMockDb()
    })
    afterEach(() => {
        vi.useRealTimers()
    })
}

export interface CallOptions {
    /** Usuario de los fixtures con el que se hace el pedido. Sin `as`, va sin token. */
    as?: string
    body?: unknown
    query?: Record<string, string>
}

/** Un token vivo para ese usuario, como después de un login. */
function tokenOf(username: string): string {
    const user = db.users.find((u) => u.username === username)
    if (!user) throw new Error(`No hay ningún usuario "${username}" en los fixtures del mock.`)
    return issueToken(user.id)
}

export function call(method: HttpMethod, path: string, options: CallOptions = {}): MockResponse {
    return resolveRequest({
        method,
        path,
        query: new URLSearchParams(options.query),
        body: options.body,
        token: options.as ? tokenOf(options.as) : undefined,
    })
}

/** El `data` de una respuesta exitosa. */
export function dataOf<T>(response: MockResponse): T {
    return (response.body as { data: T }).data
}

/** El `error` de una respuesta fallida. */
export function errorOf(response: MockResponse) {
    return (response.body as { error: { code: string; message: string; details: Record<string, string> | null } }).error
}
