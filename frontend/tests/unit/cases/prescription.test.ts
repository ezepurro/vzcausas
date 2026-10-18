import { describe, expect, it } from 'vitest'
import { estimatedExpiry, prescriptionProgress } from '@/features/cases/utils/prescription'

describe('prescripción de una causa', () => {
    describe('prescriptionProgress', () => {
        const today = new Date(2026, 8, 15)

        it('calcula el porcentaje transcurrido y lo que resta', () => {
            expect(prescriptionProgress('2021-02-27', '2029-02-27', today)).toEqual({
                percent: 69,
                remaining: 'Restan 2 años 5 meses',
                tone: 'primary',
            })
        })

        it('pasado el 70 % se pinta en bronce', () => {
            expect(prescriptionProgress('2022-01-19', '2028-01-19', today)?.tone).toBe('warn')
        })

        it('vencido el plazo, está prescripta', () => {
            expect(prescriptionProgress('2019-04-10', '2021-04-10', today)).toEqual({
                percent: 100,
                remaining: 'Prescripta',
                tone: 'danger',
            })
        })
    })

    describe('estimatedExpiry', () => {
        /* CA-18.6: la fecha del hecho más los meses de prescripción de esa
           calificación. */
        it('el vencimiento estimado corre desde la fecha del hecho', () => {
            expect(estimatedExpiry('2021-02-27', 96)).toBe('2029-02-27')
            expect(estimatedExpiry('2025-11-14', 78)).toBe('2032-05-14')
            expect(estimatedExpiry('2026-09-02', 24)).toBe('2028-09-02')
        })
    })
})
