import { describe, expect, it } from 'vitest'
import { buildLawyerPatch, hasChanges } from '@/features/lawyers/utils/buildLawyerPatch'
import type { Lawyer } from '@/features/lawyers/types/lawyer'

/**
 * El parche de "Modificar abogado" (HU14) manda sólo lo que cambió: un PATCH
 * vacío es un 400 (CA-14.10) y la misma matrícula no es un cambio (CA-14.7).
 */

const PERALTA: Lawyer = {
    id: 4,
    lastName: 'Peralta',
    firstName: 'Ignacio',
    registrationNumber: '1-35207',
    activeCases: 16,
    active: true,
}

const SAME = { lastName: 'Peralta', firstName: 'Ignacio', registrationNumber: '1-35207' }

describe('buildLawyerPatch', () => {
    // CA-14.10: sin cambios no hay nada que mandar.
    it('sin cambios devuelve un parche vacío', () => {
        const patch = buildLawyerPatch(PERALTA, SAME)
        expect(patch).toEqual({})
        expect(hasChanges(patch)).toBe(false)
    })

    it('los espacios de más no cuentan como cambio', () => {
        const patch = buildLawyerPatch(PERALTA, {
            lastName: ' Peralta ',
            firstName: 'Ignacio  ',
            registrationNumber: ' 1-35207',
        })
        expect(patch).toEqual({})
    })

    // CA-14.1, CA-14.7: viaja sólo el campo cambiado, recortado; la matrícula propia no.
    it('manda sólo el campo que cambió, recortado', () => {
        const patch = buildLawyerPatch(PERALTA, { ...SAME, firstName: ' Ignacio José ' })
        expect(patch).toEqual({ firstName: 'Ignacio José' })
        expect(hasChanges(patch)).toBe(true)
    })

    // La matrícula es opcional: vaciarla la borra.
    it('vaciar la matrícula manda null', () => {
        expect(buildLawyerPatch(PERALTA, { ...SAME, registrationNumber: '  ' })).toEqual({ registrationNumber: null })
    })

    it('sin matrícula, dejarla vacía no es un cambio', () => {
        const withoutRegistration: Lawyer = { ...PERALTA, registrationNumber: null }
        expect(buildLawyerPatch(withoutRegistration, { ...SAME, registrationNumber: '' })).toEqual({})
    })
})
