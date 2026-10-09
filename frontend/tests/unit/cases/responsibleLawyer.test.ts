import { describe, expect, it } from 'vitest'
import { isResponsibleLawyer } from '@/features/cases/utils/responsibleLawyer'

/**
 * Sólo el abogado responsable de la causa registra sus actos (V3 D-30). No es
 * un permiso por rol, así que no vive en `ACTION_ACCESS`: depende de la causa.
 * Lo usan el detalle de la causa (HU-22) y el alta de acto (HU-26).
 */

const CASE = { responsibleLawyer: { id: 3, fullName: 'Dra. Malena Ríos', registrationNumber: '1-36842' } }

describe('isResponsibleLawyer', () => {
    it('sólo el abogado responsable de la causa', () => {
        expect(isResponsibleLawyer(CASE, 3)).toBe(true)
        expect(isResponsibleLawyer(CASE, 1)).toBe(false)
    })

    it('un usuario sin ficha de abogado nunca lo es', () => {
        expect(isResponsibleLawyer(CASE, null)).toBe(false)
    })
})
