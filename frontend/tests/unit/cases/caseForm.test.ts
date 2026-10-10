import { describe, expect, it } from 'vitest'
import { changeJurisdiction, changeSacNumber, emptyCaseForm } from '@/features/cases/utils/caseForm'
import type { CaseFormValues } from '@/features/cases/types/case'

describe('formulario de alta de causa', () => {
    describe('emptyCaseForm', () => {
        it('arranca en el fuero penal, sin calificaciones ni objeto', () => {
            const values = emptyCaseForm()

            expect(values.jurisdiction).toBe('CRIMINAL')
            expect(values.proceduralRole).toBe('DEFENSA')
            expect(values.legalQualifications).toEqual([])
            expect(values.subjectMatter).toBe('')
        })

        /* CA-18.2 y CA-18.4: el SAC, la contraparte y el objeto arrancan vacíos. */
        it('arranca sin SAC, sin instructor y sin interno', () => {
            const values = emptyCaseForm()

            expect(values.sacNumber).toBe('')
            expect(values.instructorName).toBe('')
            expect(values.tribunalPhone).toBe('')
            expect(values.instructorExtension).toBe('')
            expect(values.counterparty).toBe('')
        })

        /* CA-18.2: sin SAC no se carga la fecha de inicio. */
        it('arranca sin fecha de inicio', () => {
            expect(emptyCaseForm().startDate).toBe('')
        })
    })

    /* CA-18.2: la fecha de inicio va con el SAC. */
    describe('changeSacNumber', () => {
        const withSac: CaseFormValues = { ...emptyCaseForm(), sacNumber: '13284571', startDate: '2021-03-12' }

        it('al borrar el SAC se lleva la fecha de inicio', () => {
            expect(changeSacNumber(withSac, '')).toMatchObject({ sacNumber: '', startDate: '' })
            expect(changeSacNumber(withSac, '   ').startDate).toBe('')
        })

        it('mientras quede un SAC, la fecha se conserva', () => {
            expect(changeSacNumber(withSac, '1328457')).toMatchObject({ sacNumber: '1328457', startDate: '2021-03-12' })
        })

        it('al escribir un SAC no propone ninguna fecha', () => {
            expect(changeSacNumber(emptyCaseForm(), '1').startDate).toBe('')
        })

        it('no toca los demás campos', () => {
            const values: CaseFormValues = { ...withSac, caption: 'Carátula', clientId: '24' }
            expect(changeSacNumber(values, '')).toEqual({ ...values, sacNumber: '', startDate: '' })
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

        it('entre administrativo y amparo conserva la contraparte y el objeto', () => {
            const amparo = { ...changeJurisdiction(emptyCaseForm(), 'AMPARO'), counterparty: 'APROSS', subjectMatter: 'Cobertura.' }
            const administrative = changeJurisdiction(amparo, 'ADMINISTRATIVE')

            expect(administrative.counterparty).toBe('APROSS')
            expect(administrative.subjectMatter).toBe('Cobertura.')
            expect(administrative.proceduralRole).toBe('DEFENSA')
        })

        /* CA-18.3: el rol vuelve al primero válido del fuero nuevo (V3 §2). */
        it.each([
            ['CRIMINAL', 'DEFENSA'],
            ['ADMINISTRATIVE', 'DEFENSA'],
            ['AMPARO', 'ACTORA'],
        ] as const)('en %s el rol pasa a %s', (jurisdiction, role) => {
            expect(changeJurisdiction(emptyCaseForm(), jurisdiction).proceduralRole).toBe(role)
        })

        it('no toca el SAC, la carátula, el instructor ni la fecha de inicio', () => {
            const values: CaseFormValues = {
                ...emptyCaseForm(),
                sacNumber: '13284571',
                caption: 'Una carátula escrita a mano',
                instructorName: 'Dra. Verónica Ledesma',
                tribunalPhone: '0351 448-1200',
                instructorExtension: '214',
                startDate: '2026-09-01',
            }
            const amparo = changeJurisdiction(values, 'AMPARO')

            expect(amparo).toMatchObject({
                sacNumber: '13284571',
                caption: 'Una carátula escrita a mano',
                instructorName: 'Dra. Verónica Ledesma',
                tribunalPhone: '0351 448-1200',
                instructorExtension: '214',
                startDate: '2026-09-01',
            })
        })
    })
})
