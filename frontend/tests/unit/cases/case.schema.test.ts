import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isValid, SUBJECT_MATTER_MAX, validateCase } from '@/features/cases/schemas/case.schema'
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

    /* CA-18.1 */
    it('acepta un alta penal y un amparo completos', () => {
        expect(isValid(validateCase(CRIMINAL))).toBe(true)
        expect(isValid(validateCase(AMPARO))).toBe(true)
    })

    /* CA-18.1 y CA-18.8 */
    it('pide la carátula, el cliente y el abogado responsable', () => {
        const errors = validateCase({ ...CRIMINAL, caption: ' ', clientId: '', responsibleLawyerId: '' })

        expect(errors).toMatchObject({
            caption: 'La carátula es obligatoria.',
            clientId: 'Elegí el cliente de la causa.',
            responsibleLawyerId: 'Elegí el abogado responsable.',
        })
    })

    describe('número de SAC (CA-18.2)', () => {
        it('es opcional: sin SAC el alta procede igual (D-33)', () => {
            const errors = validateCase({ ...CRIMINAL, sacNumber: '', startDate: '' })

            expect(errors.sacNumber).toBeUndefined()
            expect(isValid(errors)).toBe(true)
        })

        it('en blanco tampoco es un SAC cargado', () => {
            expect(validateCase({ ...CRIMINAL, sacNumber: '   ', startDate: '' }).sacNumber).toBeUndefined()
        })

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

    /* CA-18.3: la tabla de roles por fuero del contrato (V3 §2). */
    it.each([
        ['CRIMINAL', 'DEFENSA'],
        ['CRIMINAL', 'QUERELLANTE_PARTICULAR'],
        ['ADMINISTRATIVE', 'DEFENSA'],
        ['ADMINISTRATIVE', 'RECURRENTE'],
        ['AMPARO', 'ACTORA'],
        ['AMPARO', 'DEMANDADA'],
    ] as const)('en %s acepta el rol %s', (jurisdiction, proceduralRole) => {
        const base = jurisdiction === 'CRIMINAL' ? CRIMINAL : { ...AMPARO, jurisdiction }
        expect(validateCase({ ...base, jurisdiction, proceduralRole }).proceduralRole).toBeUndefined()
    })

    /* CA-18.2 */
    it('la fecha de inicio no puede ser posterior a hoy', () => {
        expect(validateCase({ ...CRIMINAL, startDate: '2026-09-16' }).startDate).toBe(
            'La fecha de inicio no puede ser posterior a hoy.',
        )
        expect(validateCase({ ...CRIMINAL, startDate: '2026-09-15' }).startDate).toBeUndefined()
    })

    /* CA-18.2: la fecha de inicio va con el SAC. */
    describe('fecha de inicio y SAC (CA-18.2)', () => {
        it('con SAC es obligatoria', () => {
            expect(validateCase({ ...CRIMINAL, startDate: '' }).startDate).toBe(
                'Cargá la fecha de inicio: es obligatoria con N° de SAC.',
            )
        })

        it('sin SAC, vacía no se marca', () => {
            expect(validateCase({ ...CRIMINAL, sacNumber: '', startDate: '' }).startDate).toBeUndefined()
        })

        it('sin SAC no se carga', () => {
            expect(validateCase({ ...CRIMINAL, sacNumber: '', startDate: '2026-09-01' }).startDate).toBe(
                'Sin N° de SAC no se carga la fecha de inicio.',
            )
        })

        it('con SAC, tiene que ser una fecha que exista', () => {
            expect(validateCase({ ...CRIMINAL, startDate: '2026-02-31' }).startDate).toBe(
                'La fecha de inicio no es válida.',
            )
        })
    })

    it('el instructor, su teléfono y su interno son opcionales, con tope de largo', () => {
        expect(isValid(validateCase({ ...CRIMINAL, instructorName: '', tribunalPhone: '', instructorExtension: '' }))).toBe(true)

        expect(validateCase({ ...CRIMINAL, instructorName: 'a'.repeat(151) }).instructorName).toBe(
            'Puede tener hasta 150 caracteres.',
        )
        expect(validateCase({ ...CRIMINAL, tribunalPhone: 'a'.repeat(51) }).tribunalPhone).toBe(
            'Puede tener hasta 50 caracteres.',
        )
        expect(validateCase({ ...CRIMINAL, instructorExtension: 'a'.repeat(21) }).instructorExtension).toBe(
            'Puede tener hasta 20 caracteres.',
        )
        expect(validateCase({ ...CRIMINAL, instructorExtension: 'a'.repeat(20) }).instructorExtension).toBeUndefined()
    })

    it('la carátula y el tribunal tienen tope de 255', () => {
        expect(validateCase({ ...CRIMINAL, caption: 'a'.repeat(256) }).caption).toBe('Puede tener hasta 255 caracteres.')
        expect(validateCase({ ...CRIMINAL, court: 'a'.repeat(256) }).court).toBe('Puede tener hasta 255 caracteres.')
    })

    describe('fuero penal', () => {
        /* CA-18.5: una causa penal puede registrarse sin calificaciones (D-33). */
        it('las calificaciones legales son opcionales', () => {
            const errors = validateCase({ ...CRIMINAL, legalQualifications: [] })

            expect(errors.legalQualifications).toBeUndefined()
            expect(errors.offenseDates).toBeUndefined()
            expect(isValid(errors)).toBe(true)
        })

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

        /* CA-18.4 */
        it('no pide la contraparte ni el objeto del reclamo', () => {
            expect(validateCase(CRIMINAL).subjectMatter).toBeUndefined()
            expect(validateCase(CRIMINAL).counterparty).toBeUndefined()
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

        it('el objeto tiene hasta 800 caracteres', () => {
            expect(SUBJECT_MATTER_MAX).toBe(800)
            expect(validateCase({ ...AMPARO, subjectMatter: 'a'.repeat(800) }).subjectMatter).toBeUndefined()
            expect(validateCase({ ...AMPARO, subjectMatter: 'a'.repeat(801) }).subjectMatter).toBe('Puede tener hasta 800 caracteres.')
        })

        /* CA-18.4 */
        it('no pide calificaciones legales', () => {
            expect(validateCase(AMPARO).legalQualifications).toBeUndefined()
        })

        /* CA-18.4: la contraparte u organismo se carga, pero no es obligatoria. */
        it('la contraparte es opcional, con tope de largo', () => {
            expect(validateCase({ ...AMPARO, counterparty: '' }).counterparty).toBeUndefined()
            expect(validateCase({ ...AMPARO, counterparty: 'a'.repeat(256) }).counterparty).toBe(
                'Puede tener hasta 255 caracteres.',
            )
        })
    })
})
