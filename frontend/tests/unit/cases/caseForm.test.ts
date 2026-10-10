import { describe, expect, it } from 'vitest'
import { changeJurisdiction, changeSacNumber, emptyCaseForm } from '@/features/cases/utils/caseForm'
import type { CaseFormValues } from '@/features/cases/types/case'

describe('formulario de alta de causa', () => {
    /* CA-18.2: la fecha de inicio va con el SAC. */
    describe('changeSacNumber', () => {
        const withSac: CaseFormValues = { ...emptyCaseForm(), sacNumber: '13284571', startDate: '2021-03-12' }

        it('al borrar el SAC se lleva la fecha de inicio', () => {
            expect(changeSacNumber(withSac, '')).toMatchObject({ sacNumber: '', startDate: '' })
            expect(changeSacNumber(withSac, '   ').startDate).toBe('')
        })
    })

    describe('changeJurisdiction', () => {
        /* CA-18.3 y CA-18.4 */
        it('al salir del penal vacía las calificaciones, con sus fechas del hecho, y pone el primer rol del fuero', () => {
            const criminal: CaseFormValues = {
                ...emptyCaseForm(),
                legalQualifications: [{ legalQualificationId: 6, offenseDate: '2026-08-20' }],
            }
            const amparo = changeJurisdiction(criminal, 'AMPARO')

            expect(amparo.legalQualifications).toEqual([])
            expect(amparo.proceduralRole).toBe('ACTORA')
        })

        /* CA-18.4 */
        it('al volver al penal vacía la contraparte y el objeto', () => {
            const amparo = { ...changeJurisdiction(emptyCaseForm(), 'AMPARO'), counterparty: 'APROSS', subjectMatter: 'Cobertura.' }
            const criminal = changeJurisdiction(amparo, 'CRIMINAL')

            expect(criminal.counterparty).toBe('')
            expect(criminal.subjectMatter).toBe('')
        })
    })
})
