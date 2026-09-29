import { describe, expect, it } from 'vitest'
import { toCreateProceduralStateBody } from '@/features/legal-params/utils/toCreateProceduralStateBody'
import type {
    ProceduralState,
    ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState'

function state(id: number, name: string, position: number): ProceduralState {
    return {
        id,
        name,
        jurisdiction: 'AMPARO',
        position,
        timeLimitDays: 3,
        dayType: 'BUSINESS',
        terminal: false,
        activeCases: 0,
        active: true,
    }
}

const SIBLINGS = [state(18, 'Interposición', 1), state(19, 'Traslado', 2)]

const VALUES: ProceduralStateFormValues = {
    name: '  Oposición  ',
    positionChoice: 'LAST',
    timeLimitDays: ' 5 ',
    dayType: 'BUSINESS',
    terminal: false,
}

describe('toCreateProceduralStateBody', () => {
    it('recorta el nombre, convierte el plazo a número y usa el fuero recibido', () => {
        expect(toCreateProceduralStateBody(VALUES, 'AMPARO', SIBLINGS)).toEqual({
            name: 'Oposición',
            jurisdiction: 'AMPARO',
            timeLimitDays: 5,
            dayType: 'BUSINESS',
            terminal: false,
        })
    })

    it('al final no manda posición', () => {
        expect(toCreateProceduralStateBody(VALUES, 'AMPARO', SIBLINGS)).not.toHaveProperty('position')
    })

    it('al inicio manda la posición 1', () => {
        expect(
            toCreateProceduralStateBody({ ...VALUES, positionChoice: 'FIRST' }, 'AMPARO', SIBLINGS).position,
        ).toBe(1)
    })

    it('después de un hermano manda la posición que le sigue', () => {
        expect(
            toCreateProceduralStateBody({ ...VALUES, positionChoice: 'AFTER:18' }, 'AMPARO', SIBLINGS)
                .position,
        ).toBe(2)
    })

    it('respeta un estado sin plazo que cierra la causa', () => {
        const body = toCreateProceduralStateBody(
            { ...VALUES, timeLimitDays: '0', dayType: 'NONE', terminal: true },
            'CRIMINAL',
            SIBLINGS,
        )
        expect(body).toMatchObject({ timeLimitDays: 0, dayType: 'NONE', terminal: true, jurisdiction: 'CRIMINAL' })
    })
})
