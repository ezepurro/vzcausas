import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateCase } from '@/features/cases/schemas/case.schema'
import type { CaseFormValues } from '@/features/cases/types/case'

/**
 * La validación del alta de causa (HU-18), antes de mandar nada al servidor.
 * Cada test dice qué criterio de aceptación cubre.
 */

/** Un alta penal completa y válida, para ir rompiéndola de a un campo. */
const CRIMINAL: CaseFormValues = {
    sacNumber: '14200315',
    jurisdiction: 'CRIMINAL',
    caption: 'RUIZ, Elvira T. p.s.a. Hurto simple',
    court: '',
    instructorName: '',
    tribunalPhone: '',
    instructorExtension: '',
    clientId: '24',
    proceduralRole: 'DEFENSA',
    legalQualifications: [{ legalQualificationId: 6, offenseDate: '2026-08-20' }],
    counterparty: '',
    subjectMatter: '',
    responsibleLawyerId: '3',
    startDate: '2026-09-15',
}

const AMPARO: CaseFormValues = {
    ...CRIMINAL,
    jurisdiction: 'AMPARO',
    proceduralRole: 'ACTORA',
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

    describe('número de SAC (CA-18.2)', () => {
        it('si se informa, son exactamente 8 dígitos', () => {
            expect(validateCase({ ...CRIMINAL, sacNumber: '123' }).sacNumber).toBe('El SAC tiene 8 dígitos.')
            expect(validateCase({ ...CRIMINAL, sacNumber: '132845712' }).sacNumber).toBe('El SAC tiene 8 dígitos.')
            expect(validateCase({ ...CRIMINAL, sacNumber: '1328457a' }).sacNumber).toBe('El SAC tiene 8 dígitos.')
            expect(validateCase({ ...CRIMINAL, sacNumber: '13284571' }).sacNumber).toBeUndefined()
        })

        /* Que no esté repetido lo resuelve el backend: es un 409 que la
           pantalla pinta en este mismo campo. */
    })

    /* CA-18.3 */
    it('rechaza un rol procesal que el fuero no admite', () => {
        expect(validateCase({ ...CRIMINAL, proceduralRole: 'ACTORA' }).proceduralRole).toBe(
            'Ese rol procesal no corresponde al fuero.',
        )
        expect(validateCase({ ...AMPARO, proceduralRole: 'RECURRENTE' }).proceduralRole).toBeDefined()
    })

    /* CA-18.2: la fecha de inicio va con el SAC. */
    describe('fecha de inicio y SAC (CA-18.2)', () => {
        it('con SAC es obligatoria', () => {
            expect(validateCase({ ...CRIMINAL, startDate: '' }).startDate).toBe(
                'Cargá la fecha de inicio: es obligatoria con N° de SAC.',
            )
        })
    })

    describe('fuero penal', () => {
        /* CA-18.5 */
        it('la fecha del hecho es obligatoria en cada calificación elegida (D-28)', () => {
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

        /* CA-18.5 */
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
    })

    describe('fueros administrativo y de amparo', () => {
        /* CA-18.4 */
        it('el objeto es obligatorio, con el nombre que le da cada fuero (D-27)', () => {
            expect(validateCase({ ...AMPARO, subjectMatter: '  ' }).subjectMatter).toBe('El objeto del amparo es obligatorio.')
            expect(
                validateCase({ ...AMPARO, jurisdiction: 'ADMINISTRATIVE', proceduralRole: 'DEFENSA', subjectMatter: '' }).subjectMatter,
            ).toBe('El objeto del reclamo es obligatorio.')
        })
    })
})
