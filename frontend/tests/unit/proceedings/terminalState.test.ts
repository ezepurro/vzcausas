import { describe, expect, it } from 'vitest'
import { isInTerminalState } from '@/features/proceedings/utils/terminalState'
import type { CurrentState } from '@/features/cases'
import { ARCHIVADA, CEDULA, STATES } from './states'

/** El estado actual de una causa: nunca es `null` (V3 D-34). */
function state(partial: Partial<CurrentState>): CurrentState {
    return {
        proceduralStateId: null,
        name: 'Iniciada',
        custom: false,
        initial: true,
        proceduralActId: null,
        dueDate: null,
        businessDaysRemaining: null,
        manuallyAdjusted: false,
        ...partial,
    }
}

describe('isInTerminalState', () => {
    it('es terminal si el estado actual lo es en la tabla', () => {
        expect(
            isInTerminalState(
                { currentState: state({ proceduralStateId: ARCHIVADA.id, name: ARCHIVADA.name, initial: false }) },
                STATES,
            ),
        ).toBe(true)
        expect(
            isInTerminalState(
                { currentState: state({ proceduralStateId: CEDULA.id, name: CEDULA.name, initial: false }) },
                STATES,
            ),
        ).toBe(false)
    })

    it('en el estado inicial o con un estado escrito a mano, nunca', () => {
        expect(isInTerminalState({ currentState: state({}) }, STATES)).toBe(false)
        expect(
            isInTerminalState(
                { currentState: state({ name: 'Pedido de informes', custom: true, initial: false }) },
                STATES,
            ),
        ).toBe(false)
    })
})
