import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isValid, SUBJECT_MATTER_MAX, validateCase } from '@/features/cases/schemas/case.schema'
import type { CaseFormValues } from '@/features/cases/types/case'

/** Un alta penal completa y válida, para ir rompiéndola de a un campo. */
const CRIMINAL: CaseFormValues = {
    sacNumber: '14200315',
    jurisdiction: 'CRIMINAL',
    caption: 'RUIZ, Elvira T. p.s.a. Hurto simple',
    court: '',
    instructorName: '',
    instructorPhone: '',
    clientId: '24',
    proceduralRole: 'DEFENSE',
    legalQualifications: [{ legalQualificationId: 6, offenseDate: '2026-08-20' }],
    counterparty: '',
    subjectMatter: '',
    responsibleLawyerId: '3',
    startDate: '2026-09-15',
}

const AMPARO: CaseFormValues = {
    ...CRIMINAL,
    jurisdiction: 'AMPARO',
    proceduralRole: 'PLAINTIFF',
    legalQualifications: [],
    counterparty: 'PAMI',
    subjectMatter: 'Se ordene a PAMI la cobertura de la internación domiciliaria.',
}

describe('validateCase', () => {
    // El "hoy" de las reglas de fecha: martes 15/09/2026, como el prototipo.
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('acepta un alta penal y un amparo completos', () => {
        expect(isValid(validateCase(CRIMINAL))).toBe(true)
        expect(isValid(validateCase(AMPARO))).toBe(true)
    })

    it('pide el SAC de 8 dígitos, la carátula, el cliente y el responsable', () => {
        const errors = validateCase({ ...CRIMINAL, sacNumber: '123', caption: ' ', clientId: '', responsibleLawyerId: '' })

        expect(errors).toMatchObject({
            sacNumber: 'El SAC tiene 8 dígitos.',
            caption: 'La carátula es obligatoria.',
            clientId: 'Elegí el cliente de la causa.',
            responsibleLawyerId: 'Elegí el abogado responsable.',
        })
        expect(validateCase({ ...CRIMINAL, sacNumber: '' }).sacNumber).toBe('El número de SAC es obligatorio.')
    })

    it('rechaza un rol procesal que el fuero no admite', () => {
        expect(validateCase({ ...CRIMINAL, proceduralRole: 'PLAINTIFF' }).proceduralRole).toBeDefined()
    })

    it('la fecha de inicio no puede ser posterior a hoy', () => {
        expect(validateCase({ ...CRIMINAL, startDate: '2026-09-16' }).startDate).toBeDefined()
        expect(validateCase({ ...CRIMINAL, startDate: '2026-09-15' }).startDate).toBeUndefined()
    })

    describe('fuero penal', () => {
        it('necesita al menos una calificación legal', () => {
            const errors = validateCase({ ...CRIMINAL, legalQualifications: [] })

            expect(errors.legalQualifications).toBe('Una causa penal necesita al menos una calificación legal.')
            expect(errors.offenseDates).toBeUndefined()
        })

        it('la fecha del hecho es obligatoria en cada calificación (D-28)', () => {
            const errors = validateCase({
                ...CRIMINAL,
                legalQualifications: [
                    { legalQualificationId: 6, offenseDate: '2026-08-20' },
                    { legalQualificationId: 4, offenseDate: '' },
                ],
            })

            // Marca sólo la fila a la que le falta, y avisa en el grupo.
            expect(errors.offenseDates).toEqual({ 4: 'Cargá la fecha del hecho.' })
            expect(errors.legalQualifications).toBe('Revisá la fecha del hecho de cada calificación.')
        })

        it('la fecha del hecho no puede ser futura ni inexistente', () => {
            const errors = validateCase({
                ...CRIMINAL,
                legalQualifications: [
                    { legalQualificationId: 6, offenseDate: '2026-09-16' },
                    { legalQualificationId: 4, offenseDate: '2026-02-31' },
                    { legalQualificationId: 1, offenseDate: '2026-09-15' },
                ],
            })

            expect(errors.offenseDates).toEqual({
                6: 'No puede ser posterior a hoy.',
                4: 'La fecha del hecho no es válida.',
            })
        })

        it('no pide el objeto del reclamo', () => {
            expect(validateCase(CRIMINAL).subjectMatter).toBeUndefined()
        })
    })

    describe('fueros administrativo y de amparo', () => {
        it('el objeto es obligatorio, con el nombre que le da cada fuero (D-27)', () => {
            expect(validateCase({ ...AMPARO, subjectMatter: '  ' }).subjectMatter).toBe('El objeto del amparo es obligatorio.')
            expect(
                validateCase({ ...AMPARO, jurisdiction: 'ADMINISTRATIVE', proceduralRole: 'DEFENSE', subjectMatter: '' }).subjectMatter,
            ).toBe('El objeto del reclamo es obligatorio.')
        })

        it('el objeto tiene hasta 800 caracteres', () => {
            expect(SUBJECT_MATTER_MAX).toBe(800)
            expect(validateCase({ ...AMPARO, subjectMatter: 'a'.repeat(800) }).subjectMatter).toBeUndefined()
            expect(validateCase({ ...AMPARO, subjectMatter: 'a'.repeat(801) }).subjectMatter).toBe('Puede tener hasta 800 caracteres.')
        })

        it('no pide calificaciones legales', () => {
            expect(validateCase(AMPARO).legalQualifications).toBeUndefined()
        })

        it('la contraparte es opcional, con tope de largo', () => {
            expect(validateCase({ ...AMPARO, counterparty: '' }).counterparty).toBeUndefined()
            expect(validateCase({ ...AMPARO, counterparty: 'a'.repeat(256) }).counterparty).toBeDefined()
        })
    })
})
