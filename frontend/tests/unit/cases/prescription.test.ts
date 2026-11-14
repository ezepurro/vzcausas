import { describe, expect, it } from 'vitest'
import {
    estimatedExpiry,
    nextToPrescribe,
    otherPrescriptionAlerts,
    prescriptionNote,
    prescriptionProgress,
    shownPrescription,
} from '@/features/cases/utils/prescription'
import type { CaseLegalQualification, CasePrescription, PrescriptionDeclaration } from '@/features/cases/types/case'

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

        /* H-14 de `docs/auditoria-front`: el backend deja el día en el último
           del mes de destino; el front se pasaba al mes siguiente. */
        it('si el mes de destino es más corto, queda en su último día', () => {
            expect(estimatedExpiry('2024-08-31', 6)).toBe('2025-02-28')
            expect(estimatedExpiry('2023-08-31', 6)).toBe('2024-02-29') // bisiesto
            expect(estimatedExpiry('2024-01-31', 3)).toBe('2024-04-30')
            expect(estimatedExpiry('2024-02-29', 12)).toBe('2025-02-28')
            expect(estimatedExpiry('2024-10-31', 24)).toBe('2026-10-31')
        })
    })

    /* D-112: cada calificación trae su estado. La barra muestra la que rige
       mientras no venció; cuando venció, la próxima a prescribir. */
    describe('qué prescripción muestra la barra', () => {
        const qualification = (
            id: number,
            name: string,
            expiresOn: string,
            status: Pick<CaseLegalQualification, 'elapsedPercentage' | 'alert' | 'expired'>,
            starts: { offenseDate: string; startsOn?: string } = { offenseDate: '2024-01-10' },
        ): CaseLegalQualification => ({
            id,
            name,
            prescriptionMonths: 24,
            offenseDate: starts.offenseDate,
            prescriptionStartsOn: starts.startsOn ?? starts.offenseDate,
            prescriptionExpiresOn: expiresOn,
            ...status,
            prescriptionDeclaration: null,
        })
        const governingOf = (q: CaseLegalQualification): CasePrescription => ({
            legalQualificationId: q.id,
            legalQualificationName: q.name,
            startsOn: q.prescriptionStartsOn,
            expiresOn: q.prescriptionExpiresOn,
            elapsedPercentage: q.elapsedPercentage,
            alert: q.alert,
            expired: q.expired,
            lastInterruptiveActDate: q.prescriptionStartsOn === q.offenseDate ? null : q.prescriptionStartsOn,
        })

        const amenazas = qualification(4, 'Amenazas coactivas', '2026-01-10', { elapsedPercentage: 100, alert: true, expired: true })
        const lesiones = qualification(3, 'Lesiones graves', '2027-01-10', { elapsedPercentage: 91, alert: true, expired: false })
        const robo = qualification(1, 'Robo calificado', '2030-01-10', { elapsedPercentage: 46, alert: false, expired: false })
        const declaration: PrescriptionDeclaration = {
            prescriptionDate: '2026-09-15',
            resolution: 'Sentencia N° 214',
            grounds: null,
            registeredBy: { id: 1, lastName: 'Vázquez', firstName: 'Fernando' },
            registeredAt: '2026-09-15T12:20:00-03:00',
        }

        it('fuera del penal o sin calificaciones no hay barra', () => {
            expect(shownPrescription({ prescription: null, legalQualifications: [], prescriptionDeclaration: null })).toBeNull()
        })

        it('mientras la que rige no venció, muestra la que rige tal como llega', () => {
            const c = { prescription: governingOf(lesiones), legalQualifications: [robo, lesiones], prescriptionDeclaration: null }

            expect(shownPrescription(c)).toEqual({ kind: 'governing', prescription: c.prescription })
            expect(nextToPrescribe(c)).toBe(lesiones.id)
        })

        it('si la que rige venció, muestra la próxima a prescribir con sus valores, sin recalcularlos', () => {
            const c = { prescription: governingOf(amenazas), legalQualifications: [robo, amenazas, lesiones], prescriptionDeclaration: null }

            expect(shownPrescription(c)).toEqual({
                kind: 'next',
                prescription: {
                    legalQualificationId: 3,
                    legalQualificationName: 'Lesiones graves',
                    startsOn: '2024-01-10',
                    expiresOn: '2027-01-10',
                    elapsedPercentage: 91,
                    alert: true,
                    expired: false,
                    lastInterruptiveActDate: null,
                },
            })
            expect(nextToPrescribe(c)).toBe(lesiones.id)
        })

        it('la próxima conserva el acto interruptivo del que corre', () => {
            const reiniciada = qualification(
                5,
                'Encubrimiento',
                '2030-06-20',
                { elapsedPercentage: 35, alert: false, expired: false },
                { offenseDate: '2024-06-11', startsOn: '2024-06-20' },
            )
            const c = { prescription: governingOf(amenazas), legalQualifications: [amenazas, reiniciada], prescriptionDeclaration: null }

            expect(shownPrescription(c)).toMatchObject({
                kind: 'next',
                prescription: { startsOn: '2024-06-20', lastInterruptiveActDate: '2024-06-20' },
            })
        })

        // D-113: con el plazo cumplido y sin declarar, ninguna corre: no hay barra principal.
        it('si vencieron todas las que faltan declarar, no hay próxima', () => {
            const hurto = qualification(6, 'Hurto simple', '2026-03-01', { elapsedPercentage: 100, alert: true, expired: true })
            const c = { prescription: governingOf(amenazas), legalQualifications: [hurto, amenazas], prescriptionDeclaration: null }

            expect(shownPrescription(c)).toEqual({ kind: 'allExpired' })
            expect(nextToPrescribe(c)).toBeNull()
        })

        // D-113: la que rige, como dato histórico, con la fecha de la declaración de la causa.
        it('una causa marcada prescripta muestra la que rige, tal como llega, con la fecha de la declaración', () => {
            const c = { prescription: governingOf(amenazas), legalQualifications: [amenazas, robo], prescriptionDeclaration: declaration }

            expect(shownPrescription(c)).toEqual({ kind: 'declared', prescription: c.prescription, declaredOn: '2026-09-15' })
        })

        // Declarada antes de que el cálculo cumpliera el plazo: los valores del backend no se tocan.
        it('una causa declarada con el plazo sin cumplir conserva el porcentaje y el expired del backend', () => {
            const c = { prescription: governingOf(robo), legalQualifications: [robo], prescriptionDeclaration: declaration }

            expect(shownPrescription(c)).toEqual({
                kind: 'declared',
                prescription: expect.objectContaining({ elapsedPercentage: 46, alert: false, expired: false }),
                declaredOn: '2026-09-15',
            })
        })

        // D-113: una calificación declarada no es la próxima, aunque su plazo no se haya cumplido.
        it('una calificación declarada prescripta no cuenta para la barra', () => {
            const declaredLesiones = { ...lesiones, prescriptionDeclaration: declaration }
            const c = { prescription: governingOf(robo), legalQualifications: [robo, declaredLesiones], prescriptionDeclaration: null }

            expect(shownPrescription(c)).toEqual({ kind: 'governing', prescription: c.prescription })
            expect(nextToPrescribe(c)).toBe(robo.id)
        })

        // D-113, CA-32.13: debajo de la barra, las otras sin declarar que pasaron el 70 %.
        describe('otherPrescriptionAlerts', () => {
            it('las otras sin declarar con alerta, por vencimiento, sin la de la barra ni las declaradas', () => {
                const hurto = qualification(6, 'Hurto simple', '2026-03-01', { elapsedPercentage: 100, alert: true, expired: true })
                const declaredHurto = { ...hurto, id: 7, prescriptionDeclaration: declaration }
                const c = { legalQualifications: [robo, lesiones, amenazas, hurto, declaredHurto] }

                // La barra muestra Lesiones (la próxima): quedan las dos vencidas sin declarar.
                expect(otherPrescriptionAlerts(c, lesiones.id).map((q) => q.id)).toEqual([amenazas.id, hurto.id])
            })

            it('sin barra principal, son todas las sin declarar con alerta', () => {
                expect(otherPrescriptionAlerts({ legalQualifications: [amenazas, robo] }, null).map((q) => q.id)).toEqual([
                    amenazas.id,
                ])
            })
        })

        describe('prescriptionNote', () => {
            it('con varias calificaciones nombra la que prescribe primero', () => {
                const c = { prescription: governingOf(lesiones), legalQualifications: [robo, lesiones], prescriptionDeclaration: null }

                expect(prescriptionNote(c, { kind: 'governing', prescription: c.prescription })).toBe(
                    'Sin actos interruptivos registrados: el cómputo corre desde la fecha del hecho. Calificación que prescribe primero: Lesiones graves.',
                )
            })

            it('si muestra la próxima, dice cuál es', () => {
                const c = { prescription: governingOf(amenazas), legalQualifications: [robo, amenazas, lesiones], prescriptionDeclaration: null }
                const shown = shownPrescription(c)
                if (shown === null || shown.kind === 'allExpired') throw new Error('Se esperaba una barra')

                expect(prescriptionNote(c, shown)).toBe(
                    'Sin actos interruptivos registrados: el cómputo corre desde la fecha del hecho. Próximo a prescribir: Lesiones graves.',
                )
            })
        })
    })
})
