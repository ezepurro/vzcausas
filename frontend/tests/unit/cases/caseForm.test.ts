import { describe, expect, it } from 'vitest'
import { changeEditSacNumber, changeJurisdiction, changeSacNumber, emptyCaseForm } from '@/features/cases/utils/caseForm'
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

/*
 * CA-19.6 en "Modificar causa" (ajuste del 28/10/2026, TESTING.md §11): la
 * fecha de inicio va con el SAC, pero corregir el SAC no cambia la fecha que
 * ya tenía la causa.
 */
describe('formulario de modificación de causa', () => {
    describe('changeEditSacNumber', () => {
        const ORIGINAL_START = '2021-03-12'
        const opened: CaseFormValues = { ...emptyCaseForm(), sacNumber: '13284571', startDate: ORIGINAL_START }

        it('borrar el SAC y escribir otro conserva la fecha de inicio de la causa', () => {
            const cleared = changeEditSacNumber(opened, '', ORIGINAL_START)
            const retyped = changeEditSacNumber(cleared, '1', ORIGINAL_START)

            expect(cleared.startDate).toBe('')
            expect(retyped).toMatchObject({ sacNumber: '1', startDate: ORIGINAL_START })
        })

        it('cambiar el SAC sin vaciarlo no toca la fecha', () => {
            expect(changeEditSacNumber(opened, '13284572', ORIGINAL_START).startDate).toBe(ORIGINAL_START)
        })

        it('borrar el SAC y dejarlo vacío se lleva la fecha', () => {
            expect(changeEditSacNumber(opened, '', ORIGINAL_START)).toMatchObject({ sacNumber: '', startDate: '' })
        })

        it('una causa que no tenía SAC no tiene fecha que reponer', () => {
            const withoutSac: CaseFormValues = { ...emptyCaseForm(), sacNumber: '', startDate: '' }
            expect(changeEditSacNumber(withoutSac, '13284571', null).startDate).toBe('')
        })

        it('una fecha vaciada a mano no se repone al cambiar el SAC', () => {
            const dateCleared: CaseFormValues = { ...opened, startDate: '' }
            expect(changeEditSacNumber(dateCleared, '13284572', ORIGINAL_START).startDate).toBe('')
        })
    })
})
