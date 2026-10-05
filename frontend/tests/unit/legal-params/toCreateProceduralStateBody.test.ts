import { describe, expect, it } from 'vitest'
import { toCreateProceduralStateBody } from '@/features/legal-params/utils/toCreateProceduralStateBody'
import type { ProceduralStateFormValues } from '@/features/legal-params/types/proceduralState'

const VALUES: ProceduralStateFormValues = {
    name: '  Oposición  ',
    timeLimitDays: ' 5 ',
    dayType: 'BUSINESS',
    terminal: false,
}

describe('toCreateProceduralStateBody', () => {
    it('recorta el nombre, convierte el plazo a número y usa el fuero recibido', () => {
        expect(toCreateProceduralStateBody(VALUES, 'AMPARO')).toEqual({
            name: 'Oposición',
            jurisdiction: 'AMPARO',
            timeLimitDays: 5,
            dayType: 'BUSINESS',
            terminal: false,
        })
    })

    it('no manda posición: los estados no tienen orden (V3 D-31)', () => {
        expect(toCreateProceduralStateBody(VALUES, 'AMPARO')).not.toHaveProperty('position')
    })

    it('respeta un estado sin plazo que cierra la causa', () => {
        const body = toCreateProceduralStateBody(
            { ...VALUES, timeLimitDays: '0', dayType: 'NONE', terminal: true },
            'CRIMINAL',
        )
        expect(body).toMatchObject({ timeLimitDays: 0, dayType: 'NONE', terminal: true, jurisdiction: 'CRIMINAL' })
    })
})
