import { describe, expect, it } from 'vitest'
import {
    estimatedExpiry,
    nearestQualification,
    prescriptionProgress,
} from '@/features/cases/utils/prescription'
import type { CaseLegalQualification } from '@/features/cases/types/case'

const ROBBERY: CaseLegalQualification = {
    id: 1,
    name: 'Robo calificado — art. 167 inc. 2 CP',
    prescriptionMonths: 96,
    offenseDate: '2021-02-27',
    prescriptionStartsOn: '2021-02-27',
    prescriptionExpiresOn: '2029-02-27',
}

const THREATS: CaseLegalQualification = {
    id: 4,
    name: 'Amenazas coactivas — art. 149 bis CP',
    prescriptionMonths: 24,
    offenseDate: '2025-09-19',
    prescriptionStartsOn: '2025-09-19',
    prescriptionExpiresOn: '2027-09-19',
}

describe('prescripción de una causa', () => {
    describe('nearestQualification', () => {
        it('elige la calificación que prescribe primero', () => {
            expect(nearestQualification({ legalQualifications: [ROBBERY, THREATS] })).toBe(THREATS)
        })

        it('fuera del penal no hay ninguna', () => {
            expect(nearestQualification({ legalQualifications: [] })).toBeNull()
        })
    })

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

        it('con fechas que no sirven no dibuja nada', () => {
            expect(prescriptionProgress('', '2029-02-27', today)).toBeNull()
            expect(prescriptionProgress('2029-02-27', '2021-02-27', today)).toBeNull()
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

        /* CA-18.6: la fecha de inicio de la causa no interviene. La función no
           la recibe: se computa con la fecha del hecho y los meses, nada más. */
        it('sólo depende de la fecha del hecho y de los meses de la calificación', () => {
            expect(estimatedExpiry).toHaveLength(2)
            // Dos calificaciones de la misma causa, con hechos de fechas
            // distintas, vencen en fechas distintas.
            expect(estimatedExpiry('2026-08-30', 72)).toBe('2032-08-30')
            expect(estimatedExpiry('2026-09-02', 24)).toBe('2028-09-02')
        })

        it('sin fecha del hecho todavía no hay vencimiento', () => {
            expect(estimatedExpiry('', 96)).toBeNull()
        })
    })
})
