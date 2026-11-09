import { describe, expect, it } from 'vitest'
import { caseOperation } from '@/features/cases/utils/responsibleLawyer'

/**
 * Operación de la causa (V5 §4, D-110): qué habilita el responsable y qué el
 * rol. Los roles llegan ya resueltos con `ACTION_ACCESS` (los prueba
 * `unit/app/actionAccess.test.ts`).
 */
const CASE = { responsibleLawyer: { id: 3, lastName: 'Ríos', firstName: 'Malena', registrationNumber: null } }
const NO_ROLE = { operate: false, declarePrescription: false }

describe('caseOperation', () => {
    it('el responsable opera su causa y la marca prescripta, aunque sólo sea abogado', () => {
        expect(caseOperation(CASE, 3, NO_ROLE)).toEqual({ canOperate: true, canDeclarePrescription: true })
    })

    it('otro abogado no opera la causa ni la marca prescripta', () => {
        expect(caseOperation(CASE, 9, NO_ROLE)).toEqual({ canOperate: false, canDeclarePrescription: false })
    })

    it('sin ficha de abogado, sólo cuenta el rol', () => {
        expect(caseOperation(CASE, null, NO_ROLE)).toEqual({ canOperate: false, canDeclarePrescription: false })
    })

    it('la Secretaría opera cualquier causa pero no la marca prescripta', () => {
        expect(caseOperation(CASE, null, { operate: true, declarePrescription: false })).toEqual({
            canOperate: true,
            canDeclarePrescription: false,
        })
    })

    it('el Administrador opera cualquier causa y la marca prescripta', () => {
        expect(caseOperation(CASE, 9, { operate: true, declarePrescription: true })).toEqual({
            canOperate: true,
            canDeclarePrescription: true,
        })
    })
})
