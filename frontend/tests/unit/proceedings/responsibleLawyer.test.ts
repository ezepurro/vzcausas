import { describe, expect, it } from 'vitest'
import { isResponsibleLawyer } from '@/features/proceedings/utils/responsibleLawyer'

const CASE = { responsibleLawyer: { id: 3, fullName: 'Malena Ríos', registrationNumber: '1-31207' } }

describe('isResponsibleLawyer', () => {
    it('sólo el abogado responsable de la causa', () => {
        expect(isResponsibleLawyer(CASE, 3)).toBe(true)
        expect(isResponsibleLawyer(CASE, 1)).toBe(false)
    })

    it('un usuario sin ficha de abogado nunca lo es', () => {
        expect(isResponsibleLawyer(CASE, null)).toBe(false)
    })
})
