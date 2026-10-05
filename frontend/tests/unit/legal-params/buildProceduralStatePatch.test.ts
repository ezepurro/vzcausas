import { describe, expect, it } from 'vitest'
import {
    buildProceduralStatePatch,
    isEmptyPatch,
} from '@/features/legal-params/utils/buildProceduralStatePatch'
import type {
    ProceduralState,
    ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState'

const ORIGINAL: ProceduralState = {
    id: 20,
    name: 'Cédula',
    jurisdiction: 'CRIMINAL',
    timeLimitDays: 3,
    dayType: 'BUSINESS',
    terminal: false,
    activeCases: 0,
    active: true,
}

/** Los valores que precarga el formulario al abrir la edición. */
const UNCHANGED: ProceduralStateFormValues = {
    name: 'Cédula',
    timeLimitDays: '3',
    dayType: 'BUSINESS',
    terminal: false,
}

describe('buildProceduralStatePatch', () => {
    it('sin cambios devuelve un parche vacío', () => {
        const patch = buildProceduralStatePatch(ORIGINAL, UNCHANGED)
        expect(patch).toEqual({})
        expect(isEmptyPatch(patch)).toBe(true)
    })

    it('agregar espacios al nombre no cuenta como cambio', () => {
        expect(buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, name: '  Cédula ' })).toEqual({})
    })

    it('manda sólo el nombre si sólo cambió el nombre', () => {
        expect(buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, name: 'Cédula nueva' })).toEqual({
            name: 'Cédula nueva',
        })
    })

    it('convierte el plazo a número', () => {
        expect(buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, timeLimitDays: '10' })).toEqual({
            timeLimitDays: 10,
        })
    })

    it('manda el tipo de día y el cierre si cambiaron', () => {
        expect(
            buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, dayType: 'CONSECUTIVE', terminal: true }),
        ).toEqual({ dayType: 'CONSECUTIVE', terminal: true })
    })

    it('nunca manda el fuero ni una posición: los estados no tienen orden (V3 D-31)', () => {
        const patch = buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, name: 'Otro nombre' })

        expect(patch).not.toHaveProperty('jurisdiction')
        expect(patch).not.toHaveProperty('position')
    })
})

describe('isEmptyPatch', () => {
    it('es false si hay algún campo', () => {
        expect(isEmptyPatch({ name: 'x' })).toBe(false)
    })
})
