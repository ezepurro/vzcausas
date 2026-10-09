import { describe, expect, it } from 'vitest'
import { caseStateLabel, INITIAL_STATE_LABEL } from '@/features/cases/utils/caseState'
import type { CurrentState } from '@/features/cases/types/case'

/** El estado actual de una causa recién registrada (V3 D-34). */
const INITIAL: CurrentState = {
    proceduralStateId: null,
    name: 'Iniciada',
    custom: false,
    initial: true,
    proceduralActId: null,
    dueDate: null,
    businessDaysRemaining: null,
    manuallyAdjusted: false,
}

describe('estado procesal de una causa', () => {
    /* CA-18.7: la causa nace en el estado inicial de su fuero, "Iniciada". El
       nombre lo manda el backend; el front no pone ningún rótulo propio. */
    it('una causa recién registrada se muestra con el nombre que manda el backend', () => {
        expect(caseStateLabel(INITIAL)).toBe('Iniciada')
        expect(INITIAL_STATE_LABEL).toBe('Iniciada')
    })

    it('si el estado es de la tabla o escrito a mano, muestra su nombre igual', () => {
        expect(caseStateLabel({ ...INITIAL, proceduralStateId: 4, name: 'Alegato', initial: false })).toBe('Alegato')
        expect(
            caseStateLabel({ ...INITIAL, name: 'En espera de pericia', custom: true, initial: false }),
        ).toBe('En espera de pericia')
    })
})
