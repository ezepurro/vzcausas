import { describe, expect, it } from 'vitest'
import { opensTerm, resolveSelectedState } from '@/features/proceedings/utils/resolveState'
import { ARCHIVADA, CEDULA, DADO_DE_BAJA, ELEVACION, OPOSICION, STATES } from './states'

describe('resolveSelectedState', () => {
    it('elegido de la lista: manda el id', () => {
        expect(resolveSelectedState({ stateText: 'Cédula de notificación', proceduralStateId: '2' }, STATES))
            .toBe(CEDULA)
    })

    it('escrito con el nombre exacto de la tabla: cuenta como ese estado', () => {
        expect(resolveSelectedState({ stateText: 'oposicion al requerimiento', proceduralStateId: '' }, STATES))
            .toBe(OPOSICION)
    })

    it('escrito a mano o vacío: null', () => {
        expect(resolveSelectedState({ stateText: 'Pedido de informes', proceduralStateId: '' }, STATES)).toBeNull()
        expect(resolveSelectedState({ stateText: '', proceduralStateId: '' }, STATES)).toBeNull()
    })

    it('nunca resuelve a un estado que no se ofrece', () => {
        expect(resolveSelectedState({ stateText: ARCHIVADA.name, proceduralStateId: String(ARCHIVADA.id) }, STATES)).toBeNull()
        expect(resolveSelectedState({ stateText: DADO_DE_BAJA.name, proceduralStateId: '' }, STATES)).toBeNull()
    })
})

describe('opensTerm', () => {
    it('sólo un estado de la tabla con días abre plazo', () => {
        expect(opensTerm(CEDULA)).toBe(true)
        expect(opensTerm(ELEVACION)).toBe(false)
        expect(opensTerm(null)).toBe(false)
    })
})
