/**
 * El reloj de los tests que dependen del día.
 *
 * Los datos del mock (vencimientos, prescripciones) se ubican respecto de
 * "hoy", así que un test que afirme "vence hoy" pasaría o fallaría según el
 * día en que corra. Esto fija el día del prototipo.
 */

import { afterEach, beforeEach, vi } from 'vitest'
import { resetMockDb } from '@/shared/mocks'

/** El día que usa el prototipo: martes 15/09/2026. */
export const PROTOTYPE_TODAY = '2026-09-15'

/**
 * Fija el reloj en el día del prototipo y rearma la base.
 *
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
