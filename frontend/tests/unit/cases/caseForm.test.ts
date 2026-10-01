import { describe, expect, it } from 'vitest'
import { changeJurisdiction, emptyCaseForm } from '@/features/cases/utils/caseForm'
import type { CaseFormValues } from '@/features/cases/types/case'

describe('formulario de alta de causa', () => {
    describe('emptyCaseForm', () => {
        it('arranca en el fuero penal, sin calificaciones ni objeto', () => {
            const values = emptyCaseForm()

            expect(values.jurisdiction).toBe('CRIMINAL')
            expect(values.proceduralRole).toBe('DEFENSE')
            expect(values.legalQualifications).toEqual([])
            expect(values.subjectMatter).toBe('')
            expect(values.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        })
    })

    describe('changeJurisdiction', () => {
        it('al salir del penal vacía las calificaciones, con sus fechas del hecho, y pone el primer rol del fuero', () => {
            const criminal: CaseFormValues = {
                ...emptyCaseForm(),
                legalQualifications: [{ legalQualificationId: 6, offenseDate: '2026-08-20' }],
            }
            const amparo = changeJurisdiction(criminal, 'AMPARO')

            expect(amparo.legalQualifications).toEqual([])
            expect(amparo.proceduralRole).toBe('PLAINTIFF')
        })

        it('al volver al penal vacía la contraparte y el objeto', () => {
            const amparo = { ...changeJurisdiction(emptyCaseForm(), 'AMPARO'), counterparty: 'APROSS', subjectMatter: 'Cobertura.' }
            const criminal = changeJurisdiction(amparo, 'CRIMINAL')

            expect(criminal.counterparty).toBe('')
            expect(criminal.subjectMatter).toBe('')
        })

        it('entre administrativo y amparo conserva la contraparte y el objeto', () => {
            const amparo = { ...changeJurisdiction(emptyCaseForm(), 'AMPARO'), counterparty: 'APROSS', subjectMatter: 'Cobertura.' }
            const administrative = changeJurisdiction(amparo, 'ADMINISTRATIVE')

            expect(administrative.counterparty).toBe('APROSS')
            expect(administrative.subjectMatter).toBe('Cobertura.')
            expect(administrative.proceduralRole).toBe('DEFENSE')
        })
    })
})
