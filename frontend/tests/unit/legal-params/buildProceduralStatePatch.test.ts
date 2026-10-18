import { describe, expect, it } from 'vitest'
import { buildProceduralStatePatch } from '@/features/legal-params/utils/buildProceduralStatePatch'
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
    caseCount: 0,
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
    it('nunca manda el fuero (V3 D-36) ni una posición (V3 D-31)', () => {
        const patch = buildProceduralStatePatch(ORIGINAL, { ...UNCHANGED, name: 'Otro nombre' })

        expect(patch).not.toHaveProperty('jurisdiction')
        expect(patch).not.toHaveProperty('position')
    })
})
