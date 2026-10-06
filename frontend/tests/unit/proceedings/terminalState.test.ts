import { describe, expect, it } from 'vitest'
import { isInTerminalState } from '@/features/proceedings/utils/terminalState'
import { ARCHIVADA, CEDULA, STATES } from './states'

describe('isInTerminalState', () => {
    it('es terminal si el estado actual lo es en la tabla', () => {
        expect(isInTerminalState({ currentState: { proceduralStateId: ARCHIVADA.id, name: ARCHIVADA.name, custom: false } }, STATES))
            .toBe(true)
        expect(isInTerminalState({ currentState: { proceduralStateId: CEDULA.id, name: CEDULA.name, custom: false } }, STATES))
            .toBe(false)
    })

    it('sin actos o con un estado escrito a mano, nunca', () => {
        expect(isInTerminalState({ currentState: null }, STATES)).toBe(false)
        expect(isInTerminalState({ currentState: { proceduralStateId: null, name: 'Pedido de informes', custom: true } }, STATES))
            .toBe(false)
    })
})
