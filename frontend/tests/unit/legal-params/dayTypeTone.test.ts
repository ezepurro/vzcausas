import { describe, expect, it } from 'vitest'
import { dayTypeTone } from '@/features/legal-params/utils/dayTypeTone'

describe('dayTypeTone', () => {
    it('los días corridos van en warn: son los que hay que mirar', () => {
        expect(dayTypeTone('CONSECUTIVE')).toBe('warn')
    })

    it('los días hábiles quedan neutros', () => {
        expect(dayTypeTone('BUSINESS')).toBe('neutral')
    })

    it('un estado sin plazo también queda neutro', () => {
        expect(dayTypeTone('NONE')).toBe('neutral')
    })
})
