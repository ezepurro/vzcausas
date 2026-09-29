import { describe, expect, it } from 'vitest'
import {
    buildProceduralStatePatch,
    isEmptyPatch,
} from '@/features/legal-params/utils/buildProceduralStatePatch'
import type {
    ProceduralState,
    ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState'

function state(id: number, name: string, position: number): ProceduralState {
    return {
        id,
        name,
        jurisdiction: 'CRIMINAL',
        position,
        timeLimitDays: 3,
        dayType: 'BUSINESS',
        terminal: false,
        activeCases: 0,
        active: true,
    }
}

const A = state(10, 'Designación', 1)
const B = state(20, 'Cédula', 2)
const C = state(30, 'Citación', 3)

/** Se edita B: los hermanos son los demás, sin B. */
const ORIGINAL = B
const SIBLINGS = [A, C]

/** Los valores que precarga el formulario al abrir la edición de B. */
const UNCHANGED: ProceduralStateFormValues = {
    name: 'Cédula',
    positionChoice: 'AFTER:10',
    timeLimitDays: '3',
    dayType: 'BUSINESS',
    terminal: false,
}

describe('buildProceduralStatePatch', () => {
    it('sin cambios devuelve un parche vacío', () => {
        const patch = buildProceduralStatePatch(ORIGINAL, UNCHANGED, SIBLINGS, false)
        expect(patch).toEqual({})
        expect(isEmptyPatch(patch)).toBe(true)
    })

    it('agregar espacios al nombre no cuenta como cambio', () => {
        expect(
            buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, name: '  Cédula ' }, SIBLINGS, false),
        ).toEqual({})
    })

    it('manda sólo el nombre si sólo cambió el nombre', () => {
        expect(
            buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, name: 'Cédula nueva' }, SIBLINGS, false),
        ).toEqual({ name: 'Cédula nueva' })
    })

    it('convierte el plazo a número', () => {
        expect(
            buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, timeLimitDays: '10' }, SIBLINGS, false),
        ).toEqual({ timeLimitDays: 10 })
    })

    it('manda el tipo de día y el cierre si cambiaron', () => {
        expect(
            buildProceduralStatePatch(
                ORIGINAL,
                { ...UNCHANGED, dayType: 'CONSECUTIVE', terminal: true },
                SIBLINGS,
                false,
            ),
        ).toEqual({ dayType: 'CONSECUTIVE', terminal: true })
    })

    it('si no se tocó el select de posición, no manda posición aunque el valor difiera', () => {
        expect(
            buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, positionChoice: 'FIRST' }, SIBLINGS, false),
        ).toEqual({})
    })

    it('mover al inicio manda la posición 1', () => {
        expect(
            buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, positionChoice: 'FIRST' }, SIBLINGS, true),
        ).toEqual({ position: 1 })
    })

    it('mover al final manda la última posición', () => {
        expect(
            buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, positionChoice: 'LAST' }, SIBLINGS, true),
        ).toEqual({ position: 3 })
    })

    it('tocar el select y dejarlo en el mismo lugar no manda posición', () => {
        expect(buildProceduralStatePatch(ORIGINAL, UNCHANGED, SIBLINGS, true)).toEqual({})
    })

    it('nunca manda el fuero', () => {
        const patch = buildProceduralStatePatch(
            ORIGINAL,
            { ...UNCHANGED, name: 'Otro nombre' },
            SIBLINGS,
            true,
        )
        expect(patch).not.toHaveProperty('jurisdiction')
    })
})

describe('isEmptyPatch', () => {
    it('es false si hay algún campo', () => {
        expect(isEmptyPatch({ name: 'x' })).toBe(false)
    })
})
